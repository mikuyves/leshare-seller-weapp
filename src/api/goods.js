import base from './base';
import wepy from 'wepy';
import Page from '../utils/Page';
import Lang from '../utils/Lang';
import AV from '../utils/av-weapp-min';

export default class goods extends base {

  /**
   * 分页方法
   */
  static page() {
    const url = `${this.baseUrl}/goods`;
    return new Page(url, this._processGoodsListItem.bind(this));
  }
  /**
   * 商品分类
   */
  static async getCates() {
    let query = new AV.Query('Cate')
    return await query.find()
  }
  /**
   *  新增商品分类
   */
  static async addInnerCategories(name) {
    let cate = new AV.Object('Cate', {
      name: name
    });
    return await cate.save()
  }

  /**
   * 获取尺码列表，按指定顺序。
   */
   static async getSizes() {
     let query = new AV.Query('Size');
     query.ascending('order');
     return await query.find()
   }

  /**
   * 获取颜色列表，按指定顺序。
   */
   static async getColors() {
     let query = new AV.Query('Color');
     query.ascending('order');
     return await query.find()
   }

  /**
   * 商品品牌
   */
  static async getBrands() {
    let query = new AV.Query('Brand')
    query.ascending('name')
    return await query.find()
  }
  /**
   *  新增商品品牌
   */
  static async addInnerBrands(name) {
    let brand = new AV.Object('Brand', {
      name: name
    });
    return await brand.save()
  }

  /**
   *  新增内页选项
   */
  static async addInner(name, clsName) {
    let avObj = new AV.Object(clsName, {
      name: name
    });
    return await avObj.save()
  }

  /**
   *  获取内页选项
   */
  static async getInner(clsName) {
    const query = new AV.Query(clsName)
    query.ascending('name')
    return await query.find()
  }

  /**
   * 获取供应是列表
   */
  static async getSuppliers() {
    let query = new AV.Query('Supplier')
    query.ascending('name')
    return await query.find()
  }

  /**
   *  获取获取商品详情
   */
  static async getProdDetails(pid) {
    let query = new AV.Query('Prod')
    query.equalTo('pid', Number(pid))
    query.include('size1')
    let res = await query.first()
    let input = {name: res.get('name'), pid, innerCate: '大衣'}
    let details = {input}
    return details
  }

  /**
   * 上传图片
   */
  static async image(filePath) {
    // const url = `${this.baseUrl}/images`;
    const url = `${this.baseUrl}/images`;
    const param = {
      url,
      filePath,
      name: 'image'
    }
    return await wepy.uploadFile(param);
  }

  static async uploadImage(filePath, filename) {
    let picture = new AV.File(filename, {
      blob: {
        uri: filePath
      }
    })
    return await picture.save()
  }

  /**
   * 创建商品
   */
  static async create(data) {
    let prod = new AV.Object('Prod');
    prod.set('name', data.name);
    prod.set('pid', data.pid);
    prod.set('isSamePrice', data.isSamePrice);
    prod.set('isOnePrice', data.isOnePrice);
    prod.set('cate', data.cate)
    prod.set('brand', data.brand)
    prod.set('supplier', data.supplier)
    prod.set('mainPic', data.images[0])
    prod = await prod.save();
    console.log(prod)
    for (let pic of data.images) {
      // 中间表，为每张票对应一个商品，创建一行数据。
      let ppm = new AV.Object('ProdPicMap');
      ppm.set('prod', prod);
      ppm.set('pic', pic);
      let res = await ppm.save();
      console.log(res)
    }
    for (let sku of data.skuList) {
      let avSku = new AV.Object('Sku', sku);
      avSku.set('prod', prod)
      avSku = await avSku.save()
      console.log(avSku)
    }
  }
  /**
   * 更新商品
   */
  static async update(goodsId, goods) {
    const url = `${this.baseUrl}/goods/${goodsId}`;
    return await this.put(url, goods);
  }
  /**
   * 删除商品
   */
  static async remove(goodsId) {
    const url = `${this.baseUrl}/goods/${goodsId}`;
    return await this.delete(url);
  }
  /**
   * 商品详情
   */
  static async detail(goodsId) {
    const url = `${this.baseUrl}/goods/${goodsId}`;
    const data = await this.get(url);
    return this._processGoodsDetail(data);
  }
  /**
   * 商品上架
   */
  static async onSale(goodsId) {
    const url = `${this.baseUrl}/goods/${goodsId}/on_sale`;
    return this.put(url);
  }
  /**
   * 商品下架
   */
  static async offSale(goodsId) {
    const url = `${this.baseUrl}/goods/${goodsId}/off_sale`;
    return this.put(url);
  }

  /** ********************* 内部数据处理方法 ********************* **/

  static _processGoodsDetail(goods) {
    const pictures = goods.images;
    const input = {
      name: goods.name,
      status: goods.status == 0,
      isRecommend: goods.isRecommend == 1,
      globalCid: goods.globalCid,
      innerCid: goods.innerCid,
      goodsId: goods.id
    }
    let skuList;
    const details = goods.goodsDetails ? goods.goodsDetails : [];
    if (goods.goodsSkuInfo == null || goods.goodsSkuInfo.goodsSkuDetails == null) {
      skuList = [{
        price: goods.sellPrice,
        stock: goods.goodsStocks[0].stock,
        sku: null
      }];
    } else {
      skuList = goods.goodsSkuInfo.goodsSkuDetails.map(item => {
        const price = parseFloat(item.goodsSkuDetailBase.price).toFixed(2);
        const sku = item.sku;
        const stock = goods.goodsStocks.find(item => item.sku == sku).stock;
        return {price, sku, stock};
      });
    }
    return {pictures, input, details, skuList};
  }

  /**
   * 处理商品列表数据
   */
  static _processGoodsListItem(goods) {
    this._processGoodsPreview(goods);
    this._processGoodsPriceRange(goods);
    this._processGoodsSkuCount(goods);
    this._processGoodsDate(goods);
  }

  static _processGoodsDate(item) {
    item.createText = Lang.convertTimestapeToDay(item.createTime);
  }

  /**
   * 处理SKU数量
   */
  static _processGoodsSkuCount(item) {
    if (!item.goodsSkuInfo || !item.goodsSkuInfo.goodsSkuDetails) {
      item.skuCount = 0;
    } else {
      item.skuCount = item.goodsSkuInfo.goodsSkuDetails.length;
    }
  }

  /**
   * 处理预览图
   */
  static _processGoodsPreview(item) {
    const images = item.images;
    // 图片处理
    if (images == null || images.length < 1) {
      item.imageUrl = '/images/icons/broken.png"'
    } else if (images[0].url == null) {
      item.imageUrl = '/images/icons/broken.png';
    } else {
      item.imageUrl = images[0].url + '?imageView2/1/w/200/h/200/format/jpg/q/75|imageslim';
    }
  }

  /**
   * 处理商品区间
   */
  static _processGoodsPriceRange(detail) {
    if (!detail.goodsSkuInfo || !detail.goodsSkuInfo.goodsSkuDetails) {
      const price = parseFloat(detail.sellPrice).toFixed(2);
      detail.priceText = `￥${price}`;
      return;
    }
    const skuDetails = detail.goodsSkuInfo.goodsSkuDetails;
    let maxPrice = 0;
    let minPrice = Number.MAX_VALUE;

    for (let i in skuDetails) {
      const detail = skuDetails[i].goodsSkuDetailBase;
      maxPrice = Math.max(detail.price, maxPrice).toFixed(2);
      minPrice = Math.min(detail.price, minPrice).toFixed(2);
    }
    detail.maxPrice = maxPrice;
    detail.minPrice = minPrice;
    if (maxPrice != minPrice) {
      detail.priceText = `￥${minPrice} ~ ${maxPrice}`;
    } else {
      detail.priceText = `￥${minPrice}`;
    }
  }
}
