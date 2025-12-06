export enum Gate {
  NORTH = 'NORTH',
  EAST = 'EAST',
  SOUTH = 'SOUTH',
  WEST = 'WEST',
  HUB = 'HUB'
}

export interface GameState {
  isPlaying: boolean;
  isWon: boolean;
  isLost: boolean;
  score: number;
  lives?: number; // Added for new lives mechanic
}

// --- NORTH GATE: RAILWAY ---
export type TrainColor = 'RED' | 'BLUE' | 'YELLOW' | 'GREEN'; // Removed PURPLE (4 Stations)

export interface Train {
  id: string;
  color: TrainColor;
  trackId: string; // The segment the train is currently on
  progress: number; // 0 to 100% along the segment
  speed: number;
}

// --- EAST GATE: PORT TYCOON ---
export type PortResource = 'BROWN' | 'PINK' | 'BLUE' | 'YELLOW' | 'ORANGE' | 'GREEN' | 'PURPLE';

export interface Worker {
  id: number;
  state: 'IDLE' | 'MOVING_TO_WAREHOUSE' | 'LOADED' | 'MOVING_TO_BOAT' | 'RETURNING';
  targetResource?: PortResource;
  targetBoatId?: string;
  progress: number; // 0-100 for movement/loading
  carrying?: PortResource;
}

export interface Boat {
  id: string;
  requests: PortResource[];
  patience: number; // 100 to 0
  maxPatience: number;
}

// --- SOUTH GATE: NOODLE RUSH ---
export type NoodleType = 'PHO' | 'BUN' | 'MIEN'; // Added MIEN
export type ToppingType = 'BEEF' | 'CHICKEN' | 'EGG' | 'QUAY' | 'ONION' | 'MEATBALL';

export interface Pot {
  id: number;
  type: NoodleType;
  state: 'EMPTY' | 'COOKING' | 'COOKED' | 'BURNT';
  progress: number; // 0-100
}

export interface Bowl {
  id: number;
  noodle: NoodleType | null;
  toppings: ToppingType[];
  isSelected: boolean;
}

export interface CustomerOrder {
  id: string;
  noodle: NoodleType;
  toppings: ToppingType[];
  patience: number;
}

// --- WEST GATE: MEMORY FASHION ---
export type FabricColor = 'RED' | 'CREAM' | 'WHITE';
export type Pattern = 'LOTUS' | 'CHRYSANTHEMUM' | 'BAMBOO';
export type Style = 'LONG' | 'MIDI' | 'MODERN';

export interface FashionItem {
  color: FabricColor;
  pattern: Pattern;
  style: Style;
}

export interface FashionCustomer {
  id: string;
  createdAt: number; // For memory timing
  order: FashionItem;
  patience: number;
  isBubbleVisible: boolean; // For the memory twist
}