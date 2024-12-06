from typing import Literal
from flask_socketio import emit

from .player import Player
from .cards import Deck, CommunityCard, HandCard
from .configs import Config

class Game:
    def __init__(self):
        self.config = Config()
        self.players: dict[str, Player] = {}
        self.registered_sid: dict[str, str] = {}
        self.deck = Deck()
        self.community = CommunityCard(self.deck)
        self.current_chips: dict[str, int] = {}
        self.current_max_chip = 0
        self.status: Literal['PreFlop', 'Flop', 'Turn', 'River', 'End'] = 'PreFlop'
        self.status_chain = {
            'PreFlop': 'Flop',
            'Flop': 'Turn',
            'Turn': 'River',
            'River': None
        }
        self.prev_total_chips = 0
        self.ready_num = 0
        self.sb_index = -1

    def _update_status(self):
        self.status = self.status_chain[self.status]
    
    def add_player(self, username: str, chips: int, session_id: int):
        if username in self.players:
            raise ValueError(f'Username {username} already exists')
        player = Player(username, chips, HandCard(self.deck), 'unready', False, 'player', session_id)
        self.players[username] = player
        self.registered_sid[session_id] = username
        return self.players
    
    def player_get_ready(self, username: str):
        self.players[username].status = 'ready'
        self.ready_num += 1
        is_start = True if (self.ready_num == len(self.players)) and (self.ready_num >= 2) else False
        return is_start, self.players[username]
    
    def start_new_game(self):
        self.deck.reset()
        self.community.reset()
        self.num = len(self.players)
        self.player_usernames = list(self.players.keys())
        self.current_chips: dict[str, int] = {username: 0 for username in self.player_usernames}
        self.cummulative_chips: dict[str, int] = {username: 0 for username in self.player_usernames}
        self.prev_total_chips = 0

        self.sb_index = (self.sb_index + 1) % self.num
        self.initial_player_index = self.sb_index

        self.current_max_chip = 20
        self.next_available_bet = 40
        
        for username in self.players:
            player = self.players[username]
            if player.status == 'ready':
                player.status = 'unready'

        self.player_usernames_this_round = self.player_usernames.copy()

        return self.set_blinds()
        
    def set_blinds(self):
        # set dealer, small blind, big blind
        if self.num > 2:
            dealer_index = (self.sb_index - 1) % self.num
            self.players[self.player_usernames[dealer_index]].role = 'dealer'

        small_blind_username = self.player_usernames[self.sb_index]
        small_blind = self.players[small_blind_username]
        small_blind.role = 'small_blind'
        try:
            small_blind.change_chips(-self.config.SMALL_BLIND)
            sb_chips = self.config.SMALL_BLIND
        except ValueError:
            sb_chips = small_blind.allin()
            
        big_blind_index = (self.sb_index + 1) % self.num
        big_blind_username = self.player_usernames[big_blind_index]
        big_blind = self.players[big_blind_username]
        big_blind.role = 'big_blind'
        try:
            big_blind.change_chips(-self.config.BIG_BLIND)
            bb_chips = self.config.BIG_BLIND
        except ValueError:
            bb_chips = big_blind.allin()

        self.current_chips[small_blind_username] = sb_chips
        self.current_chips[big_blind_username] = bb_chips

        self.index_now = (self.sb_index + 2) % self.num
        next_player = self.player_usernames[self.index_now]
        self.players[next_player].my_turn = True

        return small_blind_username, big_blind_username, next_player
    
    def _get_community_cards(self):
        self.community.get_community_cards(self.status)
        return self.community.cards
    
    def new_round(self):
        self.current_max_chip = 0
        self.next_available_bet = 20
        
        for username in self.player_usernames_this_round:
            self.players[username].status = 'unready'
        
        self.index_now = self.initial_player_index
        self.players[self.player_usernames_this_round[self.index_now]].my_turn = True

        self.prev_total_chips += sum(self.current_chips.values())
        self.cummulative_chips = {username: self.cummulative_chips[username] + self.current_chips[username] for username in self.player_usernames}
        self.current_chips = {username: 0 for username in self.player_usernames}

        self._update_status()

        return self._get_community_cards(), self.prev_total_chips
    
    def is_only_one_left(self):
        counter = {}
        only_one = ''
        for username in self.player_usernames_this_round:
            status = self.players[username].status
            if status == 'unready':
                only_one = username
            counter[self.players[username].status] = counter.get(self.players[username].status, 0) + 1
        if counter.get('unready', 0) == 1 and counter.get('fold', 0) == self.num - 1:
            self.players[only_one].status = 'ready'
            return True
        return False

    def is_new_round(self):
        index = self.initial_player_index
        for _ in range(self.num):
            player_name = self.player_usernames_this_round[index]
            player = self.players[player_name]
            match player.status:
                case 'ready':
                    player.status = 'unready'
                case _:
                    self.player_usernames_this_round.remove(player_name)
                    if index < self.initial_player_index:
                        self.initial_player_index -= 1
                    index -= 1
            try:
                index = (index + 1) % len(self.player_usernames_this_round)
            except ZeroDivisionError:
                return False
        self.num = len(self.player_usernames_this_round)
        # if only one player's ready, game over!
        if self.num == 1 or self.status == 'River':
            return False
        # if at least two player're ready, start a new round
        return True        

    def check_bet(self):
        # if only one player is live, game over!
        if self.is_only_one_left():
            return True

        for username in self.player_usernames_this_round:
            if (
                self.players[username].status == 'unready'
            ) or (
                self.current_chips[username] != self.current_max_chip and self.players[username].status not in ['fold', 'allin']
            ):
                return False
        return True
    
    def next_one(self):
        self.players[self.player_usernames_this_round[self.index_now]].my_turn = False
        if self.check_bet():
            if not self.is_new_round():
                self.game_over()
            return 
        else:
            self.index_now = (self.index_now + 1) % self.num
            next_player = self.player_usernames[self.index_now]
            while self.players[next_player].status != 'unready':
                self.index_now = (self.index_now + 1) % self.num
                next_player = self.player_usernames[self.index_now]
            self.players[next_player].my_turn = True
            return next_player
    
    def call(self, username: str):
        player = self.players[username]
        need_chips = self.current_max_chip - self.current_chips[username]
        try:
            player.change_chips(-need_chips)
            self.current_chips[username] = self.current_max_chip
            player.status = 'ready' if player.chips > 0 else 'allin'
        except ValueError:
            all_chips = player.allin()
            self.current_chips[username] += all_chips
        next_player = self.next_one()
        return username, next_player
    
    def bet(self, username: str, chips: int):
        player = self.players[username]
        if chips < self.next_available_bet:
            raise ValueError('Wrong chips', self.next_available_bet, player.chips + self.current_chips[username])
        need_chips = chips - self.current_chips[username]
        try:
            player.change_chips(-need_chips)
            self.current_chips[username] = chips
            player.status = 'ready' if player.chips > 0 else 'allin'

            # update current_max_chip and next_available_bet
            self.current_max_chip = chips
            self.next_available_bet = chips * 2

            # unready other players
            for other_username in self.player_usernames:
                if other_username != username and self.players[other_username].status == 'ready':
                    self.players[other_username].status = 'unready'
        except ValueError:
            raise ValueError('Wrong chips', self.next_available_bet, player.chips + self.current_chips[username])
        next_player = self.next_one()
        return username, next_player
        
    def fold(self, username: str):
        self.players[username].status = 'fold'
        next_player = self.next_one()
        return username, next_player
    
    def game_over(self):
        while self.status != 'River':
            self._update_status()
            self._get_community_cards()
        self.status = 'End'
        self.result_dict = {}
        self.result_dict['handcards'] = {}
        self.result_dict['best_hand'] = {}
        for username in self.player_usernames:
            player = self.players[username]
            player.my_turn = False
            if player.status != 'fold':
                player.status = 'ready'
                self.result_dict['handcards'][username] = player.handcards.cards
                self.result_dict['best_hand'][username] = player.handcards.get_best_hand(self.community)
            else:
                player.status = 'unready'
        self.result_dict['reveal_waived'] = True if len(self.result_dict['best_hand']) == 1 else False
        
        sorted_handcards = sorted(self.result_dict['best_hand'], key=lambda x: self.result_dict['best_hand'][x], reverse=True)
        if self.result_dict['best_hand'][sorted_handcards[0]] != self.result_dict['best_hand'][sorted_handcards[1]]:
            self.result_dict['winner'] = sorted_handcards[0]
            self.players[self.result_dict['winner']].my_turn = True
            self.result_dict['total_chips'] = self.prev_total_chips + sum(self.current_chips.values())
            self.result_dict['pnl'] = {username: -self.cummulative_chips[username] - self.current_chips[username] for username in self.player_usernames}
            self.result_dict['pnl'][self.result_dict['winner']] += self.result_dict['total_chips']

            self.players[self.result_dict['winner']].change_chips(self.result_dict['total_chips'])
        else:
            pass
        # reset
        self.ready_num = 0
        self.current_chips = {username: 0 for username in self.player_usernames}

    def get_result(self):
        if self.status != 'End':
            raise ValueError('Game is not over yet')
        return self.result_dict