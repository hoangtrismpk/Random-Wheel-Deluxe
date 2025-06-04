// Easing function: easeOutQuart
export const easeOutQuart = (t: number, b: number, c: number, d: number): number => {
  t /= d;
  t--;
  return -c * (t * t * t * t - 1) + b;
};

// Fisher-Yates Shuffle Algorithm Helper
export const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};
