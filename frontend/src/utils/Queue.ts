class Queue<T> {
  items: T[] = [];

  constructor(items: T[] = []) {
    this.items = items;
  }

  enqueue(item: T) {
    this.items.push(item);
  }

  dequeue(): T | undefined {
    if (!this.isEmpty()) {
      return this.items.shift();
    }
  }

  peek(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }
    return this.items[0];
  }

  size(): number {
    return this.items.length;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  remove(predicate: (item: T) => boolean) {
    this.items = this.items.filter((item) => !predicate(item));
  }

  clear() {
    this.items = [];
  }
}

export default Queue;
