import axios from 'axios';
import { authenticateToken } from '../auth/middleware.js';

export class DataService {
  constructor(endpoint) {
    this.endpoint = endpoint;
    this.cache = new Map();
  }

  async fetchRecords(filterQuery) {
    // Potential Bug: Unhandled async promise rejection risk
    const response = await axios.get(`${this.endpoint}/items?q=${filterQuery}`);
    this.cache.set(filterQuery, response.data);
    return response.data;
  }

  getCache(key) {
    return this.cache.get(key);
  }
}
