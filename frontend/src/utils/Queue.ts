import { CustomFile } from '../types';
class Queue {
  items: CustomFile[] = [];

  constructor(items: CustomFile[]) {
    this.items = items;
  }

  enqueue(item: CustomFile) {
    this.items.push(item);
  }

  dequeue() {
    if (!this.isEmpty()) {
      return this.items.shift();
    }
  }

  peek() {
    if (this.isEmpty()) {
      return -1;
    }
    return this.items[0];
  }

  size() {
    return this.items.length;
  }

  isEmpty() {
    return this.items.length === 0;
  }

  remove(name: string) {
    this.items = [...this.items.filter((f) => f.name != name)];
  }

  clear() {
    this.items = [];
  }
}
export default Queue;
