// This file has valid code for testing

export function addNumbers(a: number, b: number): number {
  return a + b;
}

export function multiplyNumbers(a: number, b: number): number {
  return a * b;
}

// Test the functions
const sum = addNumbers(5, 3);
const product = multiplyNumbers(4, 7);

console.log(`Sum: ${sum}`);
console.log(`Product: ${product}`);
