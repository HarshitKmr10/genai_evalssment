const leetcode = document.body;

export function extractProblemText() {
  const description = leetcode.querySelector(
    "[data-track-load='description_content']",
  );
  if (!description) return "";

  // Create a clone of the description's HTML to manipulate
  const clone = description.cloneNode(true) as HTMLElement;

  // Replace superscripts with a text representation
  const superscriptElements = clone.querySelectorAll("sup");
  superscriptElements.forEach((sup) => {
    sup.replaceWith(`^${sup.textContent}`); // Use ^ to denote superscript
  });

  // Replace list items with a text representation
  const listElements = clone.querySelectorAll("li");
  listElements.forEach((list) => {
    list.replaceWith(`- ${list.textContent}`); // Use - for list items
  });

  return clone?.textContent?.trim() ?? ""; // Return the modified text
}

export function extractProblemHTML() {
  const description = leetcode.querySelector(
    "[data-track-load='description_content']",
  );
  if (!description) return "";
  return description.innerHTML;
}

export function extractUserCodeText() {
  const code = leetcode.querySelector<HTMLTextAreaElement>(
    "[data-track-load='code_editor'] .view-lines",
  );
  return code?.innerText ?? "";
}
