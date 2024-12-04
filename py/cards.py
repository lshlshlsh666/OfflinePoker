import random
from collections import Counter

SUIT = ['s', 'h', 'd', 'c']
RANK = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'j', 'q', 'k', 'a']
HAND_TYPE = {
    10: 'Royal Flush',
    9: 'Straight Flush',
    8: 'Four of a Kind',
    7: 'Full House',
    6: 'Flush',
    5: 'Straight',
    4: 'Three of a Kind',
    3: 'Two Pair',
    2: 'One Pair',
    1: 'High Card'
}

def changed_to_css_name(card: int):
    suit = SUIT[card // 13]
    rank = RANK[card % 13]
    return f"pcard-{rank}{suit}"
    

class Deck:
    def __init__(self):
        self.reset()

    def reset(self):
        self.cards = list(range(52))
        self._shuffle()

    def _shuffle(self):
        random.shuffle(self.cards)        

    def draw(self):
        return self.cards.pop()

    def __len__(self):
        return len(self.cards)


class CommunityCard:
    def __init__(self, deck: Deck):
        self.deck = deck
        self.cards = []
        
    def reset(self):
        self.cards = []

    def get_community_cards(self, status: str):
        if status == "Flop":
            for _ in range(3):
                self.cards.append(self.deck.draw())
        elif status == "Turn":
            self.cards.append(self.deck.draw())
        elif status == "River":
            self.cards.append(self.deck.draw())
        else:
            raise ValueError(f'Invalid status: {status}')


class HandCard:
    def __init__(self, deck: Deck):
        self.deck = deck
        
        self.cards = []
        
    def reset(self):
        self.cards = []
        
    def dealcards(self):
        for _ in range(2):
            self.cards.append(self.deck.draw())
        return self.cards;

    def get_best_hand(self, community: CommunityCard):
        matched_cards = self.cards + community.cards
        ranks = [val % 13 + 2 for val in matched_cards]
        suits = [SUIT[val // 13] for val in matched_cards]
        
        rank_counts = Counter(ranks)
        suit_counts = Counter(suits)
        
        # 是否为同花
        flush_suit = next((suit for suit, count in suit_counts.items() if count >= 5), None)
        if flush_suit:
            flush_cards = sorted([rank for rank, suit in zip(ranks, suits) if suit == flush_suit], reverse=True)
            if self.is_straight(flush_cards):
                # 是否为同花顺（皇家同花顺或同花顺）
                if flush_cards[:5] == [14, 13, 12, 11, 10]:
                    return (10, flush_cards[:5])  # 皇家同花顺
                return (9, flush_cards[:5])  # 同花顺
        
        # 是否为四条
        four_of_a_kind = next((rank for rank, count in rank_counts.items() if count == 4), None)
        if four_of_a_kind:
            remaining = sorted([rank for rank in ranks if rank != four_of_a_kind], reverse=True)
            return (8, [four_of_a_kind] * 4 + [remaining[0]])
        
        # 是否为葫芦
        three_of_a_kind = next((rank for rank, count in rank_counts.items() if count == 3), None)
        pair = next((rank for rank, count in rank_counts.items() if count == 2 and rank != three_of_a_kind), None)
        if three_of_a_kind and pair:
            return (7, [three_of_a_kind] * 3 + [pair] * 2)
        
        # 是否为同花
        if flush_suit:
            return (6, flush_cards[:5])
        
        # 是否为顺子
        if self.is_straight(ranks):
            straight_cards = self.get_straight(ranks)
            return (5, straight_cards)
        
        # 是否为三条
        if three_of_a_kind:
            remaining = sorted([rank for rank in ranks if rank != three_of_a_kind], reverse=True)
            return (4, [three_of_a_kind] * 3 + remaining[:2])
        
        # 是否为两对
        pairs = [rank for rank, count in rank_counts.items() if count == 2]
        if len(pairs) >= 2:
            top_two = sorted(pairs, reverse=True)[:2]
            remaining = sorted([rank for rank in ranks if rank not in top_two], reverse=True)
            return (3, top_two * 2 + [remaining[0]])
        
        # 是否为一对
        if len(pairs) == 1:
            pair = pairs[0]
            remaining = sorted([rank for rank in ranks if rank != pair], reverse=True)
            return (2, [pair] * 2 + remaining[:3])
        
        # 高牌
        return (1, sorted(ranks, reverse=True)[:5])

    def is_straight(self, ranks):
        unique_ranks = sorted(set(ranks), reverse=True)
        for i in range(len(unique_ranks) - 4):
            if unique_ranks[i] - unique_ranks[i + 4] == 4:
                return True
        # 检查特殊顺子 (A, 5, 4, 3, 2)
        if set([14, 5, 4, 3, 2]).issubset(set(ranks)):
            return True
        return False

    def get_straight(self, ranks):
        unique_ranks = sorted(set(ranks), reverse=True)
        for i in range(len(unique_ranks) - 4):
            if unique_ranks[i] - unique_ranks[i + 4] == 4:
                return unique_ranks[i:i + 5]
        if set([14, 5, 4, 3, 2]).issubset(set(ranks)):
            return [5, 4, 3, 2, 14]
        return []