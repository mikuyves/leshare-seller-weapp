import base from './base';
import LC from './leancloud';
import Page from '../utils/Page';
import AV from '../utils/av-weapp-min';


export default class Reminder extends base {
  /**
   * 分页方法
   */
  static page() {
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
  static async getRemindersByCustomer(customerId, prodId) {
    let query = new AV.Query('Reminder');
    let handler = new AV.Object.createWithoutData(
      '_User', AV.User.current().toJSON().objectId
    )
    let customer = new AV.Object.createWithoutData('_User', customerId);
    let prod = new AV.Object.createWithoutData('Prod', prodId);
    query.equalTo('handler', handler)
    query.equalTo('customer', customer)
    query.equalTo('prod', prod)
    query.include('sku')
    let res = await query.find()
    let data = res.map(item => item.toJSON())
    return data
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
      // 删除
      if (r.qtt === 0 && res) {
        res.destroy();
      // 忽略
      } else if (r.qtt === 0) {
        continue
      // 更新
      } else if (res) {
          res.set('price', r.price)
          res.set('qtt', r.qtt)
          res.set('showPriceId', r.showPriceId)
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
        line.set('showPriceId', r.showPriceId);
        line.set('handler', handler);
        line.set('customer', AV.parseJSON(customer));
        lines = [...lines, line];
      }

    }
    return AV.Object.saveAll(lines)
  }
  /**
   * 保存调整库存, 用于日志。
   */
  static async saveAdjustments(adjustments) {
    // 记录调整日志。
    let adjs = adjustments.map(item => {
      let adj = new AV.Object('Adjustment');
      let sku = AV.Object.createWithoutData('Sku', item.sku.objectId);
      let prod = item.sku.prod;
      let handler = AV.User.current();
      adj.set('sku', sku);
      adj.set('prod', prod);
      adj.set('handler', handler);
      adj.set('orgQtt', item.orgQtt);
      adj.set('increment', item.increment);
      adj.set('qtt', item.qtt);
      return adj
    })
    // 更新 sku 库存。
    for (let item of adjustments) {
      let sku = AV.Object.createWithoutData('Sku', item.sku.objectId);
      sku.increment('stock', item.increment);
      await sku.save(null, {
        fetchWhenSave: true,
      });
    }
    return AV.Object.saveAll(adjs)
  }


  /** ********************* 内部数据处理方法 ********************* **/

  static async _getRemindersData(param) {
    let lines = await this.getRemindersWithDetail(param);
    lines = lines.map(item => item.toJSON())
    let data = LC.groupByPointer(lines, 'customer', 'prod')
    console.log(data)
    for (let [i, c] of data.entries()) {
      data[i].prodList = LC.groupByPointer(c.prodList, 'prod', 'sku')
      data[i].totalQtt = this.totalList(
          data[i].prodList.map(prod => {
          return prod.skuList.map(sku => sku.qtt)
        })
      )
      data[i].totalPrice = this.totalList(
          data[i].prodList.map(prod => {
          return prod.skuList.map(sku => sku.qtt * sku.price)
        })
      )
    }
    return data
  }

  //  拆解数组。将一个含有子数组的数组，变成一个字含有基本元素的数组。
  static flatten(arr) {
    return [].concat(...arr)
  }

  static totalList(arr) {
    let flatList = this.flatten(arr)
    return flatList.reduce((total, num) => total + num, 0)
  }
}
