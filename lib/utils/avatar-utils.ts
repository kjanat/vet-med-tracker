/**
 * Generate a consistent color based on a string (e.g., animal name, household name)
 * Returns a color that works well with white text
 */
export function getAvatarColor(name: string): string {
  // Predefined colors that work well with white text
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-cyan-500",
    "bg-orange-500",
    "bg-teal-500",
    "bg-rose-500",
    "bg-violet-500",
    "bg-amber-500",
    "bg-emerald-500",
  ];

  // Generate a consistent index based on the name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % colors.length;
  return colors[index] || colors[0] || "#9CA3AF";
}
