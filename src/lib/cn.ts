// Joins class names, skipping empty values: cn("a", false && "b", "c") -> "a c"
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
