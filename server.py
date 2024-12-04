from flask import Flask, send_from_directory, request
from flask_socketio import SocketIO, emit, join_room
import uuid
import random
import itertools
from collections import Counter
from itertools import combinations

from py.game import Game

app = Flask(__name__, static_folder='.')
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*")
initial_sid_map = {}
sessions = {1: None}

# Global variables
GAME = Game()
IS_START = False


def generate_sid():
    """生成唯一的 SID"""
    return str(uuid.uuid4())

@socketio.on('connect')
def handle_connect():
    """处理 WebSocket 连接"""
    mysid = request.args.get("mysid")  # 从请求中获取 SID
    if mysid and mysid in sessions:
        # 恢复会话
        print(f"Restoring session for SID: {mysid}")
        sessions[mysid]['socket_id'] = request.sid
        if 'player' in sessions[mysid]['data']:
            socketio.emit('session_restored', {'player': sessions[mysid]['data']['player'].to_dict()}, room=request.sid)
        else:
            socketio.emit('session_restored', {'player': None}, room=request.sid)
    else:
        # 创建新会话
        mysid = generate_sid()
        print(f"Creating new session with SID: {mysid}")
        sessions[mysid] = {'socket_id': request.sid, 'data': {}}  # 存储会话信息
        socketio.emit('new_sid', {'mysid': mysid}, room=request.sid)
        initial_sid_map[request.sid] = mysid


@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/css/<path:path>')
def serve_css(path):
    return send_from_directory('./css', path)

@app.route('/js/<path:path>')
def serve_js(path):
    return send_from_directory('./js', path)


@socketio.on('join')
def on_join(data):
    username, chips, alone = data['username'], data['chips'], data['alone']
    mysid = request.args.get('mysid')
    if mysid not in GAME.registered_sid:
        try:
            players = GAME.add_player(username, chips, mysid)
            sessions[mysid]['data']['player'] = players[username]
        except ValueError:
            emit('UsernameExistsError', to=request.sid)
            return
        
    players = GAME.players
    if alone:
        emit('UpdatePlayerInfo', {
            username: players[username].to_dict() for username in players
        }, to=request.sid)
        emit('UpdateBetChips', {
            username: current_bid_chip for username, current_bid_chip in GAME.current_chips.items() if current_bid_chip > 0
        }, to=request.sid)
        emit('UpdateUI', {
            'is_ready': players[username].status == 'ready',
            'is_playing': IS_START,
            'handcards': players[username].handcards.cards
        }, to=request.sid)
    else:
        emit('UpdatePlayerInfo', {
            username: players[username].to_dict() for username in players
        }, broadcast=True)
    

@socketio.on('ready')
def on_ready(data):
    username = data['username']
    is_start, player = GAME.player_get_ready(username)
    
    emit('UpdatePlayerInfo', {
        username: player.to_dict()
        },broadcast=True)
    
    if is_start:
        global IS_START
        IS_START = True
        emit('GameStarted', broadcast=True)
        dealcards()
        small_blind_username, big_blind_username, sb_chips, bb_chips = GAME.start_game()
        emit('UpdatePlayerInfo', {
            small_blind_username: GAME.players[small_blind_username].to_dict(),
            big_blind_username: GAME.players[big_blind_username].to_dict()
        }, broadcast=True)
        emit('UpdateBetChips', {
            small_blind_username: sb_chips,
            big_blind_username: bb_chips
        }, broadcast=True)

def dealcards():
    for player in GAME.players.values():
        cards = player.get_handcards()
        emit('DealtCards', {
            'cards': cards
        }, to=sessions[player.session_id]['socket_id'])
        
@socketio.on('GetPlayerUsernames')
def on_get_player_usernames():
    emit('PlayerUsernames', {
        'player_usernames': list(GAME.players.keys())
    }, to=request.sid)

# @socketio.on('call')
# def on_call(data):
#     name = data['username']
#     flag = CHIP_CENTER.call(name)
#     if flag:
#         emit("ChipsChanged", {
#             'username': name,
#             'chips': Players[name].chips,
#         }, broadcast=True)
#     else:
#         emit("InsufficientChips", to=request.sid)
        
# @socketio.on('bet')
# def on_bet(data):
#     name, chips = data['username'], data['chips']
#     flag = CHIP_CENTER.bet(name, chips)
    
#     if flag:
#         emit("ChipsChanged", {
#             'username': name,
#             'chips': Players[name].chips,
#         }, broadcast=True)
#     else:
#         emit("InsufficientChips", to=request.sid)

# @socketio.on('fold')
# def on_fold(data):
#     name = data['username']
#     emit("PlayerFolded", {
#         'username': name
#     }, broadcast=True)


if __name__ == '__main__':
    socketio.run(app, host='172.20.10.13', port=8080)