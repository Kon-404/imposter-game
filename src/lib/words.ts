const WORD_LISTS: Record<string, string[]> = {
  'Everyday Objects': [
    'Umbrella', 'Toothbrush', 'Mirror', 'Scissors', 'Candle',
    'Pillow', 'Wallet', 'Sunglasses', 'Backpack', 'Watch',
    'Headphones', 'Lighter', 'Stapler', 'Broom', 'Doorbell',
    'Remote Control', 'Keychain', 'Notebook', 'Charger', 'Mug',
    'Blanket', 'Flashlight', 'Zipper', 'Pencil', 'Eraser',
  ],
  'Famous People': [
    'Albert Einstein', 'Elon Musk', 'Taylor Swift', 'Leonardo da Vinci',
    'Beyonce', 'Steve Jobs', 'Cristiano Ronaldo', 'Oprah Winfrey',
    'Michael Jordan', 'Shakespeare', 'Cleopatra', 'The Rock',
    'Adele', 'Barack Obama', 'Lionel Messi', 'Marie Curie',
    'Tom Hanks', 'Rihanna', 'Nelson Mandela', 'Drake',
  ],
  'Foods & Drinks': [
    'Pizza', 'Sushi', 'Tacos', 'Ice Cream', 'Espresso',
    'Avocado', 'Croissant', 'Bubble Tea', 'Pancakes', 'Ramen',
    'Chocolate', 'Burrito', 'Cheesecake', 'Smoothie', 'Popcorn',
    'Mango', 'Waffles', 'Nachos', 'Milkshake', 'Pasta',
    'Steak', 'Donut', 'Lobster', 'Pretzel', 'Tiramisu',
  ],
  'Animals': [
    'Penguin', 'Chameleon', 'Dolphin', 'Red Panda', 'Octopus',
    'Flamingo', 'Koala', 'Jellyfish', 'Peacock', 'Hedgehog',
    'Platypus', 'Panda', 'Owl', 'Shark', 'Elephant',
    'Sloth', 'Cheetah', 'Parrot', 'Wolf', 'Seahorse',
  ],
  'Places': [
    'Eiffel Tower', 'Grand Canyon', 'Tokyo', 'Amazon Rainforest',
    'Great Wall of China', 'Venice', 'Sahara Desert', 'Hollywood',
    'Machu Picchu', 'Sydney Opera House', 'Bermuda Triangle',
    'Times Square', 'Niagara Falls', 'Taj Mahal', 'Antarctica',
    'Las Vegas', 'Mount Everest', 'Stonehenge', 'Vatican City', 'Dubai',
  ],
  'Movies & TV Shows': [
    'Titanic', 'Breaking Bad', 'The Lion King', 'Stranger Things',
    'Harry Potter', 'Game of Thrones', 'Inception', 'Friends',
    'Star Wars', 'The Office', 'Avatar', 'Squid Game',
    'Jurassic Park', 'The Simpsons', 'Batman', 'Frozen',
    'Spider-Man', 'Wednesday', 'Shrek', 'The Matrix',
  ],
};

export function getWordsForCategories(categories: string[]): string[] {
  return categories.flatMap((cat) => WORD_LISTS[cat] || []);
}

export function pickRandomWord(categories: string[]): { word: string; category: string } {
  const validCategories = categories.filter((cat) => WORD_LISTS[cat]);
  if (validCategories.length === 0) {
    return { word: 'Umbrella', category: 'Everyday Objects' };
  }
  const category = validCategories[Math.floor(Math.random() * validCategories.length)];
  const words = WORD_LISTS[category];
  const word = words[Math.floor(Math.random() * words.length)];
  return { word, category };
}

export function generateHint(word: string, category: string): string {
  return `The word is from the category: ${category}`;
}
