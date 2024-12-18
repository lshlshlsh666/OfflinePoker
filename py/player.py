from dataclasses import dataclass
from typing import Literal

from .cards import HandCard

@dataclass
class Player:
    username: str
    chips: int
    handcards: HandCard
    status: Literal['unready', 'ready', 'fold', 'allin']
    my_turn: bool
    role: Literal['small_blind', 'big_blind', 'dealer', 'player']
    current_bet: int
    session_id: int
    
    def to_dict(self):
        return {
            'username': self.username,
            'chips': self.chips,
            'handcards': self.handcards.cards,
            'status': self.status,
            'my_turn': self.my_turn,
            'role': self.role,
            'current_bet': self.current_bet,
        }
        
    def get_handcards(self):
        return self.handcards.dealcards()
    
    def change_chips(self, chips: int):
        if chips < 0 and self.chips + chips < 0:
            raise ValueError('Insufficient chips')
        self.chips += chips

        if self.chips == 0:
            self.status = 'allin'

        return self.chips
    
    def allin(self):
        all_in_chips = self.chips
        self.chips = 0
        self.status = 'allin'
        return all_in_chips
    
    def reset(self):
        self.handcards.reset()
        self.status = 'unready'
        self.my_turn = False
        self.role = 'player'
        self.current_bet = 0