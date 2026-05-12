import { createId, nowIso } from "../utils/id.js";
import { sanitizeUser } from "../utils/security.js";

export function createCaseComment({ caseId, authorId, text }) {
  return {
    id: createId("comment"),
    caseId,
    authorId,
    text: String(text ?? "").trim(),
    createdAt: nowIso()
  };
}

export function getCaseComments(data, caseId) {
  return (data.caseComments ?? [])
    .filter((comment) => comment.caseId === caseId)
    .map((comment) => {
      const author = data.users.find((user) => user.id === comment.authorId);
      return {
        ...comment,
        author: sanitizeUser(author)
      };
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}
