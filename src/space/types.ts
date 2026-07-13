import type { Pet } from '../types';

export interface Decoration {
  id: string;
  kind: string;
  x: number;
  y: number;
}

export interface SpaceYardProps {
  pets: Pet[];
  decorations: Decoration[];
  editMode: boolean;
  onPetTap: (petId: string) => void;
  onMoveDecoration: (id: string, x: number, y: number) => void;
  onRemoveDecoration: (id: string) => void;
}
