/**
 * Sleep for N milliseconds
 */
export async function sleep(ms: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (isNaN(ms)) {
      throw new Error('ms is not a number')
    }
    setTimeout(() => resolve(true), ms)
  })
}
