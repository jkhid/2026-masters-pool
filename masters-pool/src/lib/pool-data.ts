export interface PlayerPicks {
  name: string;
  golfers: string[];
}

export const PLAYERS: PlayerPicks[] = [
  { name: "Ryan", golfers: ["Bryson DeChambeau", "Jordan Spieth", "Shane Lowry", "Sepp Straka", "Matthew McCarty", "Aaron Rai"] },
  { name: "Ethan", golfers: ["Ludvig Aberg", "Chris Gotterup", "Min Woo Lee", "Sungjae Im", "Jacob Bridgeman", "Aaron Rai"] },
  { name: "Jamal", golfers: ["Xander Schauffele", "Patrick Reed", "Corey Conners", "Adam Scott", "JJ Spaun", "Nicolai Hojgaard"] },
  { name: "Adi", golfers: ["Ludvig Aberg", "Chris Gotterup", "Akshay Bhatia", "Cameron Smith", "JJ Spaun", "Max Greyserman"] },
  { name: "Nathan", golfers: ["Xander Schauffele", "Hideki Matsuyama", "Akshay Bhatia", "Cameron Smith", "Maverick McNealy", "Nicolai Hojgaard"] },
  { name: "Cole", golfers: ["Scottie Scheffler", "Justin Rose", "Si Woo Kim", "Max Homa", "Harris English", "Andrew Novak"] },
  { name: "Thomas", golfers: ["Jon Rahm", "Justin Rose", "Patrick Cantlay", "Cameron Smith", "JJ Spaun", "John Keefer"] },
  { name: "Jai", golfers: ["Scottie Scheffler", "Justin Rose", "Russell Henley", "Adam Scott", "JJ Spaun", "Nicolai Hojgaard"] },
  { name: "Nic", golfers: ["Bryson DeChambeau", "Brooks Koepka", "Akshay Bhatia", "Adam Scott", "Jacob Bridgeman", "Ryan Fox"] },
];

// All unique golfers across all players
export const ALL_GOLFERS = Array.from(
  new Set(PLAYERS.flatMap(p => p.golfers))
).sort();

// Map golfer -> which players have them
export function getGolferOwners(golferName: string): string[] {
  return PLAYERS.filter(p => p.golfers.includes(golferName)).map(p => p.name);
}
