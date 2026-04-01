export const PALETTE = [
  { bg: "#EEEDFE", fg: "#3C3489" },
  { bg: "#E1F5EE", fg: "#085041" },
  { bg: "#FAECE7", fg: "#712B13" },
  { bg: "#E6F1FB", fg: "#0C447C" },
  { bg: "#FAEEDA", fg: "#633806" },
  { bg: "#FBEAF0", fg: "#72243E" },
  { bg: "#EAF3DE", fg: "#27500A" },
  { bg: "#FCEBEB", fg: "#501313" },
];
export function getColor(index: number) { return PALETTE[index % PALETTE.length]; }
export function initials(name: string) { return name.slice(0, 2).toUpperCase(); }
export function genCode(): string {
  const words = ["ALPHA","BRAVO","DELTA","FORGE","NEXUS","ORBIT","PULSE","SIGMA","TITAN","VORTEX","ZENITH","CIPHER","AXIOM","BLAZE","COMET","EMBER","FLINT","GHOST","HAVEN","IVORY","JOLT","LUNAR","MIDAS","NOBLE"];
  return words[Math.floor(Math.random() * words.length)];
}