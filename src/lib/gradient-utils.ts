/**
 * Generate deterministic gradient from course ID
 * Uses hash to ensure consistency across all views
 */
export function generateCourseGradient(courseId: string): string {
  let hash = 0;
  for (let i = 0; i < courseId.length; i++) {
    hash = courseId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Generate two complementary hues for a nice gradient
  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 45 + (Math.abs(hash >> 8) % 30)) % 360; // Offset by 45-75 degrees

  return `linear-gradient(135deg, hsl(${hue1}, 70%, 60%), hsl(${hue2}, 65%, 50%))`;
}

/**
 * Get tailwind-compatible gradient classes based on course ID
 * Returns a tuple of [fromColor, toColor] for use with gradient classes
 */
export function getCourseGradientColors(courseId: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < courseId.length; i++) {
    hash = courseId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    ['from-rose-500', 'to-orange-400'],
    ['from-violet-500', 'to-purple-400'],
    ['from-blue-500', 'to-cyan-400'],
    ['from-emerald-500', 'to-teal-400'],
    ['from-amber-500', 'to-yellow-400'],
    ['from-pink-500', 'to-rose-400'],
    ['from-indigo-500', 'to-blue-400'],
    ['from-cyan-500', 'to-sky-400'],
    ['from-fuchsia-500', 'to-pink-400'],
    ['from-lime-500', 'to-green-400'],
  ];
  
  const index = Math.abs(hash) % colors.length;
  return colors[index] as [string, string];
}

