from .player import Player

class ChipsCenter:
    def __init__(self, Players: dict[str, Player]):
        self.players = Players
        self.n_players = len(Players)
        self.reset()
        
    def reset(self):
        self.current_chips = dict(zip((player.name for player in self.players.values()), [0] * self.n_players))
        self.reset_ready()
        self.max_chips = 0
        self.next_available_bet_chips = 0
        
    def reset_ready(self):
        for player in self.players.values():
            player.is_ready = False

    def call(self, name: str):
        diff = self.max_chips - self.current_chips[name]
        if diff <= self.players[name].chips:
            self.players[name].chips -= diff
            self.current_chips[name] = self.max_chips
            self.players[name].is_ready = True
            return True
        else:
            return False
    
    def check(self, name: str):
        self.players[name].is_ready = True
        return True

    def bet(self, name: str, chips: int):
        assert chips >= self.next_available_bet_chips
        
        diff = chips - self.current_chips[name]
        if diff <= self.players[name].chips:
            self.players[name].chips -= diff
            self.current_chips[name] = chips
            self.max_chips = chips
            self.next_available_bet_chips = chips * 2
            self.reset_ready()
            self.players[name].is_ready = True
            return True
        else:
            return False
        
    def check_all_ready(self):
        return all(player.is_ready for player in self.players.values())