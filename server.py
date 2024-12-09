from flask import Flask, send_from_directory, request
from flask_socketio import SocketIO, emit

import uuid
import json

from py.game import Game

app = Flask(__name__, static_folder='.')
socketio = SocketIO(app, cors_allowed_origins="*")
initial_sid_map = {}
sessions = {}

# Global variables
GAME = Game()
IS_START = False

def generate_sid():
    return str(uuid.uuid4())

@socketio.on('connect')
def handle_connect():
    mysid = request.args.get("mysid")
    if mysid and mysid in sessions:
        sessions[mysid]['socket_id'] = request.sid
        if 'player' in sessions[mysid]['data']:
            socketio.emit('session_restored', {'player': sessions[mysid]['data']['player'].to_dict()}, room=request.sid)
        else:
            socketio.emit('session_restored', {'player': None}, room=request.sid)
    else:
        mysid = generate_sid()
        sessions[mysid] = {'socket_id': request.sid, 'data': {}, 'reset_all_player': False}
        socketio.emit('new_sid', {'mysid': mysid}, room=request.sid)
        initial_sid_map[request.sid] = mysid


@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

@app.route('/css/<path:path>')
def serve_css(path):
    return send_from_directory('./css', path)

@app.route('/js/<path:path>')
def serve_js(path):
    return send_from_directory('./js', path)


@socketio.on('join')
def on_join(data):
    username, chips, alone = data['username'], data['chips'], data['alone']
    if not alone and chips > GAME.config.MAX_INITIAL_CHIPS:
        emit('GreedySB', {'penalty': GAME.config.GREEDY_PENALTY}, to=request.sid)
        chips = GAME.config.GREEDY_PENALTY
    mysid = request.args.get('mysid')

    # for those rejoined players
    if GAME.registered_sid.get(mysid, None) in GAME.dead_players:
        GAME.dead_players.remove(GAME.registered_sid[mysid])
        GAME.registered_sid.pop(mysid)
        sessions[mysid]['reset_all_player'] = False

    if mysid not in GAME.registered_sid:
        try:
            players = GAME.add_player(username, chips, mysid)
            sessions[mysid]['data']['player'] = players[username]
        except ValueError:
            emit('UsernameExistsError', to=request.sid)
            return
        
    players = GAME.players
    if alone:
        try:
            emit('UpdateRoundInfo', {
                'current_max_chip': GAME.current_max_chip,
                'big_blind_username': GAME.player_usernames[GAME.sb_index + 1],
                'big_blind_required': GAME.config.BIG_BLIND
            }, to=request.sid)
        except:
            pass
        message = {username: players[username].to_dict() for username in players}
        message['is_playing'] = IS_START
        emit('UpdatePlayerInfo', message, to=request.sid)
        emit('UpdateBetChips', {
            username: current_bid_chip for username, current_bid_chip in GAME.current_chips.items() if current_bid_chip > 0
        }, to=request.sid)
        emit('UpdateUI', {
            'is_ready': players[username].status == 'ready',
            'is_playing': IS_START,
            'handcards': players[username].handcards.cards
        }, to=request.sid)
        emit('UpdateCenterZone', {
            'community_cards': GAME.community.cards,
            'this_round_total_chips': sum(GAME.current_chips.values()),
            'prev_total_chips': GAME.prev_total_chips
        }, to=request.sid)
    else:
        emit('UpdatePlayerInfo', {
            username: players[username].to_dict() for username in players
        }, broadcast=True)
    

@socketio.on('ready')
def on_ready(data):
    username = data['username']
    if username in GAME.dead_players:
        player = GAME.players.pop(username)
        mysid = player.session_id
        sessions[mysid]['data'].pop('player')
        emit('reset_html', to=request.sid)
        emit('session_restored', {'player': None}, to=request.sid)
        return
    
    is_start, player = GAME.player_get_ready(username)

    if sessions[player.session_id]['reset_all_player']:
        emit('RemovePlayer', {
        'dead_players': GAME.dead_players
        }, to=request.sid)
        emit('UpdatePlayerInfo', {
            username: player.to_dict() for username, player in GAME.players.items()
            },to=request.sid)
        emit('flash', to=request.sid)
        sessions[player.session_id]['reset_all_player'] = False
    else:
        emit('UpdatePlayerInfo', {
            username: player.to_dict()
            },broadcast=True)
    
    if is_start:
        for player in GAME.players.values():
            player.reset()
        global IS_START
        IS_START = True
        small_blind_username, big_blind_username, next_player = GAME.start_new_game()
        emit('GameStarted', broadcast=True)
        dealcards()
        emit('UpdateRoundInfo', {
            'current_max_chip': GAME.current_max_chip,
            'big_blind_username': big_blind_username,
            'big_blind_required': GAME.config.BIG_BLIND
        }, broadcast=True)
        emit('UpdatePlayerInfo', {
            small_blind_username: GAME.players[small_blind_username].to_dict(),
            big_blind_username: GAME.players[big_blind_username].to_dict(),
            next_player: GAME.players[next_player].to_dict()
        }, broadcast=True)
        emit('UpdateBetChips', {
            small_blind_username: GAME.current_chips[small_blind_username],
            big_blind_username: GAME.current_chips[big_blind_username],
        }, broadcast=True)
        emit('UpdateCenterZone', {
            'community_cards': GAME.community.cards,
            'this_round_total_chips': sum(GAME.current_chips.values()),
            'prev_total_chips': GAME.prev_total_chips
        }, broadcast=True)
        emit('RemovePnl', {
            'username': GAME.player_usernames
        }, broadcast=True)
        emit('flash', broadcast=True)
        
@socketio.on('GetPlayerUsernames')
def on_get_player_usernames():
    emit('PlayerUsernames', {
        'player_usernames': list(GAME.players.keys())
    }, to=request.sid)

def new_round():
    community_cards, prev_total_chips = GAME.new_round()
    emit("UpdateCenterZone", {
        'community_cards': community_cards,
        'this_round_total_chips': 0,
        'prev_total_chips': prev_total_chips
    }, broadcast=True)
    emit('UpdateRoundInfo', {
        'current_max_chip': GAME.current_max_chip,
    }, broadcast=True)
    emit('UpdatePlayerInfo', {
        username: player.to_dict() for username, player in GAME.players.items()
    }, broadcast=True)
    emit('UpdateBetChips', {
        username: 0 for username in GAME.players
    }, broadcast=True)

@socketio.on('call')
def on_call(data):
    username = data['username']
    now_player, next_player = GAME.call(username)
    if next_player:
        emit('UpdatePlayerInfo', {
            now_player: GAME.players[now_player].to_dict(),
            next_player: GAME.players[next_player].to_dict(),
        }, broadcast=True)
        emit('UpdateBetChips', {
            now_player: GAME.current_chips[now_player],
            next_player: GAME.current_chips[next_player]
        }, broadcast=True)
    else:
        if GAME.status == 'End':
            emit("RoundEnd", GAME.get_result(), broadcast=True)
            emit('UpdatePlayerInfo', {username: player.to_dict() for username, player in GAME.players.items()}, broadcast=True)
            emit('UpdateBetChips', {username: 0 for username in GAME.players}, broadcast=True)
            emit("UpdateCenterZone", {'community_cards': GAME.community.cards, 'this_round_total_chips': 0, 'prev_total_chips': GAME.prev_total_chips}, broadcast=True)
        else:
            new_round()
        
@socketio.on('bet')
def on_bet(data):
    username, chips = data['username'], data['chips']

    try:
        now_player, next_player = GAME.bet(username, int(chips))
    except ValueError as e:
        if e.args[0] == 'Wrong chips':
            min_bet, max_bet = e.args[1:]
            emit('WrongbetChipsError',
                    {'min_bet': min_bet, 'max_bet': max_bet},
                to=request.sid)
            return
        elif e.args[0] == 'you must all in':
            emit('InsufficientChipsForAllin', to=request.sid)
            return
    
    if next_player:
        emit('UpdateRoundInfo', {
            'current_max_chip': GAME.current_max_chip,
        }, broadcast=True)
        emit('UpdatePlayerInfo', {
            now_player: GAME.players[now_player].to_dict(),
            next_player: GAME.players[next_player].to_dict(),
        }, broadcast=True)
        emit('UpdateBetChips', {
            now_player: GAME.current_chips[now_player],
            next_player: GAME.current_chips[next_player]
        }, broadcast=True)
    else:
        if GAME.status == 'End':
            emit("RoundEnd", GAME.get_result(), broadcast=True)
            emit('UpdatePlayerInfo', {username: player.to_dict() for username, player in GAME.players.items()}, broadcast=True)
            emit('UpdateBetChips', {username: 0 for username in GAME.players}, broadcast=True)
            emit("UpdateCenterZone", {'community_cards': GAME.community.cards, 'this_round_total_chips': 0, 'prev_total_chips': GAME.prev_total_chips}, broadcast=True)
        else:
            new_round()


@socketio.on('fold')
def on_fold(data):
    username = data['username']
    now_player, next_player = GAME.fold(username)

    if next_player:
        emit('UpdatePlayerInfo', {
            now_player: GAME.players[now_player].to_dict(),
            next_player: GAME.players[next_player].to_dict(),
        }, broadcast=True)
    else:
        if GAME.status == 'End':
            emit("RoundEnd", GAME.get_result(), broadcast=True)
            emit('UpdatePlayerInfo', {username: player.to_dict() for username, player in GAME.players.items()}, broadcast=True)
            emit('UpdateBetChips', {username: 0 for username in GAME.players}, broadcast=True)
            emit("UpdateCenterZone", {'community_cards': GAME.community.cards, 'this_round_total_chips': 0, 'prev_total_chips': GAME.prev_total_chips}, broadcast=True)
        else:
            new_round()

def dealcards():
    for player in GAME.players.values():
        cards = player.get_handcards()
        emit('DealtCards', {
            'cards': cards
        }, to=sessions[player.session_id]['socket_id'])

@socketio.on('initializeRound')
def on_initialize_round():
    if GAME.status != 'End':
        return

    global IS_START
    IS_START = False

    GAME.status = 'PreFlop'
    for mysid in sessions:
        sessions[mysid]['reset_all_player'] = True

    GAME.check_dead_player()


@socketio.on('exit')
def on_exit(data):
    player = GAME.players[data['username']]
    player.status = 'fold'
    GAME.dead_players.append(data['username'])

    if player.my_turn:
        on_fold(data)
    

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=80)