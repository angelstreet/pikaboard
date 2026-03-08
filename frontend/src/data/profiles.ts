// Mock profiles data for the dating app

export interface Profile {
  id: string;
  name: string;
  age: number;
  bio: string;
  image: string;
  generation: number; // Pokemon generation 1-9
  country: string;
  distance: number; // km
  interests: string[];
}

export interface Match {
  id: string;
  profile: Profile;
  matchedAt: Date;
  lastMessage?: Message;
  unread: number;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
}

export interface Filters {
  ageMin: number;
  ageMax: number;
  distanceMax: number;
  country: string;
  generation: number[];
}

// Mock profiles - Pokemon-themed dating app
export const mockProfiles: Profile[] = [
  {
    id: '1',
    name: 'Misty',
    age: 22,
    bio: 'Water-type trainer looking for someone to go on adventures with. Love surfing and fishing!',
    image: 'https://img.pokemondb.net/trainers/gen8/mistysw.webp',
    generation: 1,
    country: 'US',
    distance: 5,
    interests: ['Water', 'Fishing', 'Travel'],
  },
  {
    id: '2',
    name: 'Brock',
    age: 25,
    bio: 'Rock-type specialist and chef. Looking for someone who appreciates a good boulder.',
    image: 'https://img.pokemondb.net/trainers/gen8/brocksw.webp',
    generation: 1,
    country: 'JP',
    distance: 12,
    interests: ['Rock', 'Cooking', 'Fighting'],
  },
  {
    id: '3',
    name: 'Ash',
    age: 21,
    bio: 'Gonna be the very best! Looking for a partner who loves adventure as much as I do.',
    image: 'https://img.pokemondb.net/trainers/gen8/ashsw.webp',
    generation: 1,
    country: 'US',
    distance: 3,
    interests: ['Adventure', 'Fighting', 'Flying'],
  },
  {
    id: '4',
    name: 'Leaf',
    age: 22,
    bio: 'Champion of Johto! Looking for someone to explore the region with.',
    image: 'https://img.pokemondb.net/trainers/gen8/leafsw.webp',
    generation: 2,
    country: 'JP',
    distance: 8,
    interests: ['Grass', 'Cycling', 'Nature'],
  },
  {
    id: '5',
    name: 'Ethan',
    age: 24,
    bio: 'Johto champion and Pokemon researcher. Looking for smart matches!',
    image: 'https://img.pokemondb.net/trainers/gen8/ethansw.webp',
    generation: 2,
    country: 'US',
    distance: 15,
    interests: ['Research', 'Fighting', 'Gaming'],
  },
  {
    id: '6',
    name: 'May',
    age: 20,
    bio: 'Contest star in training! Looking for someone with style.',
    image: 'https://img.pokemondb.net/trainers/gen8/maysw.webp',
    generation: 3,
    country: 'AU',
    distance: 20,
    interests: ['Contests', 'Drawing', 'Fashion'],
  },
  {
    id: '7',
    name: 'Brendan',
    age: 21,
    bio: 'Hoenn champion. Love the beach and outdoor activities!',
    image: 'https://img.pokemondb.net/trainers/gen8/brendansw.webp',
    generation: 3,
    country: 'US',
    distance: 25,
    interests: ['Beach', 'Surfing', 'Adventure'],
  },
  {
    id: '8',
    name: 'Dawn',
    age: 20,
    bio: 'Contest champion! Looking for someone creative and fun.',
    image: 'https://img.pokemondb.net/trainers/gen8/dawnsw.webp',
    generation: 4,
    country: 'JP',
    distance: 30,
    interests: ['Contests', 'Music', 'Fashion'],
  },
  {
    id: '9',
    name: 'Hilbert',
    age: 23,
    bio: 'Unova champion ready for new challenges!',
    image: 'https://img.pokemondb.net/trainers/gen8/hilbertsw.webp',
    generation: 5,
    country: 'DE',
    distance: 40,
    interests: ['Fighting', 'Science', 'Tech'],
  },
  {
    id: '10',
    name: ' Hilda',
    age: 22,
    bio: 'Battle queen of Unova! Looking for a strong match.',
    image: 'https://img.pokemondb.net/trainers/gen8/hildasw.webp',
    generation: 5,
    country: 'US',
    distance: 45,
    interests: ['Fighting', 'Gym', 'Training'],
  },
  {
    id: '11',
    name: 'Serena',
    age: 19,
    bio: 'Kalos performer and Rookie Cup winner!',
    image: 'https://img.pokemondb.net/trainers/gen8/serenasw.webp',
    generation: 6,
    country: 'FR',
    distance: 50,
    interests: ['Performance', 'Cooking', 'Fashion'],
  },
  {
    id: '12',
    name: 'Shauna',
    age: 19,
    bio: 'Looking for adventure buddies! Love making friends with Pokemon and people.',
    image: 'https://img.pokemondb.net/trainers/gen8/shaunasw.webp',
    generation: 6,
    country: 'FR',
    distance: 52,
    interests: ['Friends', 'Drawing', 'Play'],
  },
  {
    id: '13',
    name: 'Elena',
    age: 21,
    bio: 'Alola champion ready to explore the world!',
    image: 'https://img.pokemondb.net/trainers/gen8/elaynafull.webp',
    generation: 7,
    country: 'US',
    distance: 60,
    interests: ['Island', 'Beach', 'UFOs'],
  },
  {
    id: '14',
    name: 'Chase',
    age: 22,
    bio: 'Galar competitor looking for sparring partners and more!',
    image: 'https://img.pokemondb.net/trainers/gen8/chasesw.webp',
    generation: 8,
    country: 'UK',
    distance: 70,
    interests: ['Dynamax', 'Fashion', 'Gaming'],
  },
  {
    id: '15',
    name: 'May',
    age: 20,
    bio: 'Paldea trainer! Looking for friends and adventures.',
    image: 'https://img.pokemondb.net/trainers/gen8/may_paldea.webp',
    generation: 9,
    country: 'ES',
    distance: 80,
    interests: ['Terastallize', 'Travel', 'Food'],
  },
];

// Current user profile
export const currentUser: Profile = {
  id: 'current',
  name: 'You',
  age: 24,
  bio: 'Looking for someone special to go on Pokemon adventures with!',
  image: 'https://img.pokemondb.net/trainers/gen8/ashsw.webp',
  generation: 1,
  country: 'US',
  distance: 0,
  interests: ['Gaming', 'Travel', 'Pokemon'],
};

// Countries for filter
export const countries = ['US', 'JP', 'UK', 'FR', 'DE', 'AU', 'ES', 'CA'];

// Generations
export const generations = [1, 2, 3, 4, 5, 6, 7, 8, 9];
