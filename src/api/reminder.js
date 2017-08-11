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
   *  分页处理。获取备忘，包括 Pointer 的数据。
   */
  static getRemindersWithDetail({from, limit}) {
    let query = new AV.Query('Reminder')
    let handler = new AV.Object.createWithoutData(
      '_User', AV.User.current().toJSON().objectId
    )
    query.equalTo('handler', handler)
    query.descending('createdAt')
    query.skip(from)
    query.limit(limit)
    query.include('sku')
    query.include('prod')
    query.include('prod.mainPic')
    query.include('customer')
    return query.find();
  }
  /**
   * 保存备忘
   */
  static async saveReminders(reminders, customer) {
    let lines = [];
    // 记录操作的员工
    let handler = AV.User.current();
    for (let r of reminders) {
      let line = new AV.Object('Reminder');
      let sku = AV.Object.createWithoutData('Sku', r.sku.objectId);
      // 检查是否存在此 sku 的记录。
      let res = await new AV.Query('Reminder')
        // 注意，查询 pointer 是否相等时，必须要 createWithoutData。
        .equalTo('handler', new AV.Object.createWithoutData('_User', handler.toJSON().objectId))
        .equalTo('customer', new AV.Object.createWithoutData('_User', customer.objectId))
        .equalTo('sku', sku)
        .first()
      // 更新
      if (res) {
          res.set('price', r.price)
          res.increment('qtt', r.qtt)
          res = await res.save(null, {
          fetchWhenSave: true,
        });
        console.log(res)
      } else {
      // 创建
        line.set('prod', r.sku.prod)
        line.set('sku', sku);
        line.set('qtt', r.qtt);
        line.set('price', r.price);
        line.set('handler', handler);
        line.set('customer', AV.parseJSON(customer));
        lines = [...lines, line];
      }

    }
    return AV.Object.saveAll(lines)
  }

  /** ********************* 内部数据处理方法 ********************* **/

  static async _getRemindersData(param) {
    let lines = await this.getRemindersWithDetail(param);
    lines = lines.map(item => item.toJSON())
    let data = LC.groupByPointer(lines, 'customer', 'prod')
    console.log(data)
    for (let [i, c] of data.entries()) {
      data[i].prodList = LC.groupByPointer(c.prodList, 'prod', 'sku')
    }
    return data
  }
}
