import http from './Http'
import AV from './av-weapp-min.js'

export default class Pagination {
  constructor (clsName, processFunc) {
    // 数据访问地址
    this.clsName = clsName;
    // 数据集合
    this.list = [];
    // 起始数据
    this.start = 0;
    // 加载数据条数
    this.count = 10;
    // 数据处理函数
    this.processFunc = processFunc;
    // 正在加载中
    this.loading = false;
    // 参数
    this.params = [];
    // 是否底部
    this.reachBottom = false;
    // 是否需要清除
    this.toClear = false;
  }

  /**
   * 加载下一页数据
   */
  async next (args) {
    const param = {
      from: this.start,
      limit: this.count
    };
    // 附加参数
    this.loading = true;
    Object.assign(param, args);

    // 获取数据。TODO: 需要抽离。
    let query = new AV.Query(this.clsName)
    query.descending('createdAt')
    query.skip(this.start)
    query.limit(this.count)
    query.include('mainPic')
    query.include('brand')
    query.include('cate')
    query.include('supplier')
    const data = await query.find();

    // 底部判断
    if (data === null || data.length < 1) {
      if (this.toClear) {
        this.clear();
      } else {
        this.reachBottom = true;
      }
      return this;
    }

    // 处理数据
    // this._processData(data)
    await this._processData2(data)

    // 设置数据
    if (this.toClear) {
      this.list = data;
      this.toClear = false;
    } else {
      this.list = this.list.concat(data);
    }
    this.start += this.count;
    // 加载完毕
    this.loading = false;
    if (data.length < this.count) {
      this.reachBottom = true;
    }
    return this;
  }

  /**
   * 恢复到第一页
   */
  reset () {
    this.toClear = true;
    this.start = 0;
  }
  clear () {
    this.toClear = false;
    this.start = 0;
    this.list = [];
  }

  /**
   * 处理数据（私有）
   */
  _processData (data) {
    if (this.processFunc) {
      for (let i in data) {
        const result = this.processFunc(data[i]);
        if (result) {
          data[i] = result;
        }
      }
    }
  }

  /**
   * 处理数据（私有）测试。TODO：需要抽离。
   */
  async _processData2(data) {
    for (let prod of data) {
      let skus = await new AV.Query('Sku')
        .equalTo('prod', prod)
        .include('color')
        .include('size1')
        .find()

      let skuList = skus.map(item => item.toJSON());

      let skuNames = skuList.map(item => item.color.name).join(' ');

      let skuStocks = skuList.map(item => item.stock);
      let sumStock = skuStocks.reduce((total, num) => total + num);

      let skuPrice2s = skuList.map(item => item.price2);
      let maxPrice = Math.max(...skuPrice2s).toFixed(2);
      let minPrice = Math.min(...skuPrice2s).toFixed(2);

      prod.set('skuList', skuList);
      prod.set('stock', sumStock);
      prod.set('skuNames', skuNames);
      if (maxPrice != minPrice) {
        prod.set('priceText', `￥${minPrice} ~ ${maxPrice}`);
      } else {
        prod.set('priceText', `￥${minPrice}`);
      }

      prod = prod.toJSON();
    }
  }
}
