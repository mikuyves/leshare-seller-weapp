import base from './base';
import LC from './leancloud';
import Page from '../utils/Page';
import AV from '../utils/av-weapp-min';


export default class Reminder extends base {
  /**
   * 分页方法
   */
  static page() {
    console.log("I am here.")
    return new Page(
      this._getRemindersData.bind(this),  // 获取数据
    );
  }
  /**
   *  分页处理。获取商品列表，包括 Pointer 的数据。
   */
  static getRemindersWithDetail() {
    let query = new AV.Query('Reminder')
    let handler = new AV.Object.createWithoutData(
      '_User', AV.User.current().toJSON().objectId
    )
    query.equalTo('handler', handler)
    query.descending('createdAt')
    query.include('sku')
    query.include('prod')
    query.include('prod.mainPic')
    query.include('customer')
    return query.find();
  }

  /** ********************* 内部数据处理方法 ********************* **/

  static async _getRemindersData() {
    let lines = await this.getRemindersWithDetail();
    lines = lines.map(item => item.toJSON())
    let data = LC.groupByPointer(lines, 'customer', 'prods')
    console.log(data)
    for (let [i, c] of data.entries()) {
      data[i].prods = LC.groupByPointer(c.prods, 'prod', 'skus')
    }
    return data
  }
}
