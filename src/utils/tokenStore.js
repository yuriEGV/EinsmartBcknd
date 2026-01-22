const invalidatedTokens = new Set();

function add(token) {
  invalidatedTokens.add(token);
}

function has(token) {
  return invalidatedTokens.has(token);
}

export { add, has };

