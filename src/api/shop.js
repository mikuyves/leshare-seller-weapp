
import base from './base';
import AV from '../utils/av-weapp-min'

export default class shop extends base {

  static async list() {
  	let query = new AV.Query('Shop')
  	return await query.find()
  }

  static async info() {
    const url = `${this.baseUrl}/shops`;
    return await this.get(url);
  }
}
