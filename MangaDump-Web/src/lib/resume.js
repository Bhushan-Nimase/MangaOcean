// Where should "Continue" take the reader?
// `state` is a library item or status object from the API; `firstNumber` is the manga's first chapter.
export function resumeTarget(state, firstNumber = state?.firstChapterNumber) {
  if (!state || state.lastChapterNumber == null) {
    return firstNumber == null ? null : { number: firstNumber, page: 1, label: `Start reading · Ch. ${firstNumber}` }
  }

  const { lastChapterNumber: last, lastPageNumber, lastChapterPageCount: count, nextChapterNumber: next } = state
  const page = lastPageNumber && lastPageNumber > 0 ? lastPageNumber : 1
  const finishedChapter = count != null && page >= count

  if (finishedChapter && next != null) {
    return { number: next, page: 1, label: `Next chapter · Ch. ${next}` }
  }
  if (finishedChapter) {
    return { number: last, page, label: `Up to date · Ch. ${last}`, caughtUp: true }
  }
  return { number: last, page, label: `Continue · Ch. ${last} · page ${page}` }
}

export const readerPath = (slug, target) =>
  `/manga/${slug}/chapter/${target.number}${target.page > 1 ? `?page=${target.page}` : ''}`
