
export function getPieChartSVG(correct: number, incorrect: number) {
    const total = correct + incorrect;
    const incorrectPerc = (incorrect / total) * 100;

    return `<?xml version="1.0" encoding="iso-8859-1"?>
    <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 20 20">
    <circle r="10" cx="10" cy="10" fill="green" />
    <circle r="5" cx="10" cy="10" fill="transparent"
            stroke="red"
            stroke-width="10"
            stroke-dasharray="calc(` + incorrectPerc + ` * 31.4 / 100) 31.4"
            transform="rotate(-90) translate(-20)" />
  </svg>`;
}