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
        
        self.ready_num = 0
        self.sb_index = -1
    
    def add_player(self, username: str, chips: int, session_id: int):
        if username in self.players:
            raise ValueError(f'Username {username} already exists')
        player = Player(username, chips, HandCard(self.deck), 'unready', False, session_id)
        self.players[username] = player
        self.registered_sid[session_id] = username
        return self.players
    
    def player_get_ready(self, username: str):
        self.players[username].status = 'ready'
        self.ready_num += 1
        is_start = True if (self.ready_num == len(self.players)) and (self.ready_num >= 2) else False
        return is_start, self.players[username]
    
    def start_game(self):
        self.deck.reset()
        self.community.reset()
        self.num = len(self.players)
        self.player_usernames = list(self.players.keys())
        self.current_chips: dict[str, int] = {username: 0 for username in self.player_usernames}
        
        self.current_max_chip = 10
        self.next_available_bet = 20
        
        for username in self.players:
            self.players[username].status = 'unready'

        self.index_now = (self.sb_index + 3) % self.num
        self.players[self.player_usernames[self.index_now]].my_turn = True

        return self.set_blind_bet()
        
    def set_blind_bet(self):
        self.sb_index = (self.sb_index + 1) % self.num
        
        small_blind_username = self.player_usernames[self.sb_index]
        small_blind = self.players[small_blind_username]
        try:
            small_blind.change_chips(-self.config.SMALL_BLIND)
            sb_chips = self.config.SMALL_BLIND
        except ValueError:
            sb_chips = small_blind.allin()
            
        big_blind_index = (self.sb_index + 1) % self.num
        big_blind_username = self.player_usernames[big_blind_index]
        big_blind = self.players[big_blind_username]
        try:
            big_blind.change_chips(-self.config.BIG_BLIND)
            bb_chips = self.config.BIG_BLIND
        except ValueError:
            bb_chips = big_blind.allin()

        self.current_chips[small_blind_username] = sb_chips
        self.current_chips[big_blind_username] = bb_chips

        return small_blind_username, big_blind_username, sb_chips, bb_chips
        