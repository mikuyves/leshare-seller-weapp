import base from './base';
import wepy from 'wepy';
import Page from '../utils/Page';
import Lang from '../utils/Lang';
import AV from '../utils/av-weapp-min';
import LC from '../api/leancloud';

export default class goods extends base {

  /**
   * 分页处理。分页方法。
   */
  static page() {
    return new Page(
      this._getProdListData.bind(this),  // 获取数据
      this._processProdListItem.bind(this)  // 处理数据
    );
  }
  /**
   * 获取商品及 sku 详情。
   */
  static async getProdAndSkuWithDetail(goodsId) {
    let prod = {}
    // 扫码入口，未完善。TODO
    if (goodsId.length === 7 && Number(goodsId)) {
      prod = await this.getProdByPid(goodsId)
      if (!prod) {
        return null
      }
    } else {
      // 通过 objectId 获取资料
      prod = await this.getProdWithDetail(goodsId)
    }
    let skus = await goods.getSkuListFromProd(prod);
    return {prod, skus}
  }
  /**
   * 商品分类。
   */
  static async getCates() {
    let query = new AV.Query('Cate');
    return query.find()
  }

  static async getCatesJSON() {
    let cates = await this.getCates();
    return cates.map(item => item.toJSON())
  }

  /**
   *  新增商品分类。
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
   * 商品品牌。
   */
  static async getBrands() {
    let query = new AV.Query('Brand')
    query.ascending('name')
    return await query.find()
  }
  /**
   *  新增商品品牌。
   */
  static async addInnerBrands(name) {
    let brand = new AV.Object('Brand', {
      name: name
    });
    return await brand.save()
  }
  /**
   *  新增内页选项。
   */
  static async addInner(name, clsName) {
    let avObj = new AV.Object(clsName, {
      name: name
    });
    return await avObj.save()
  }
  /**
   *  获取内页选项。
   */
  static async getInner(clsName) {
    const query = new AV.Query(clsName)
    query.ascending('name')
    return query.find()
  }
  /**
   * 获取供应是列表。
   */
  static async getSuppliers() {
    let query = new AV.Query('Supplier')
    query.ascending('name')
    return await query.find()
  }
  /**
   *  通过7位商品编码获取商品详情。
   */
  static async getProdByPid(pid) {
    let query = new AV.Query('Prod')
    query.equalTo('pid', Number(pid))
    query.include('brand')
    query.include('cate')
    query.include('supplier')
    return query.first()
  }
  /**
   *  获取单个商品列表，包括 Pointer 的数据。
   */
  static async getProdWithDetail(goodsId) {
    let prod = AV.Object.createWithoutData('Prod', goodsId)
    return prod.fetch({
      include: [
        'brand',
        'cate',
        'supplier'
      ]
    })
  }
  /**
   *  获取单个商品的图片列表。
   */
  static async getProdPics(prod) {
    let query = new AV.Query('ProdPicMap')
    query.equalTo('prod', prod)
    query.include('pic')
    let ppm = await query.find()
    let pics = ppm.map(item => item.toJSON().pic.url)
    return pics
  }
  /**
   *  获取单个商品的 SKU 列表。
   */
  static async getSkuListFromProd(prod) {
    let skus = await new AV.Query('Sku')
      .equalTo('prod', prod)  // 此方法可以省去数倍请求次数。但获得的数据需要后续处理。
      .include('color')
      .include('size1')
      .find()
    return skus
  }
  /**
   *  分页处理。获取商品列表，包括 Pointer 的数据。
   */
  static async getProdListWithDetail(param) {
    let {from, limit, goods_status} = param;
    let query = new AV.Query('Prod')
    if (goods_status) {
      query.equalTo(goods_status, true)
    }
    query.descending('createdAt')
    query.skip(from)
    query.limit(limit)
    query.include('brand')
    query.include('cate')
    query.include('supplier')
    return query.find();
  }
  /**
   *  分页处理。获取指定商品对应的 SKU 列表，包括 Pointer 的数据。
   */
  static async getSkuListWithDetail(prods) {
    let skus = await new AV.Query('Sku')
      .containedIn('prod', prods)  // 此方法可以省去数倍请求次数。但获得的数据需要后续处理。
      .include('color')
      .include('size1')
      .find()
    return skus
  }
  /**
   *  Leancloud Pointer 反查方法，翻查后把 relation 组合到 Pointer 的数据中。
   */
  static mapPointerRelation(pointers, relations) {
    // 注意在设定 Pointer 的 Column Name 时，必须是 Pointer 同名的小写。
    // 返回： 一个 Pointer 的数组，此数组以包含一个以 ‘<relationName>List' 命名的 relation 对象的数组。

    // 无 relations，直接返回。
    if (relations.length < 1) {
      return pointers
    }
    // 有 relations，关联起来。
    let relationListName = relations[0].className.toLowerCase() + 'List'
    let pointerColumnName = pointers[0].className.toLowerCase()
    return pointers.map(p => {
      p.set(relationListName, relations.filter(
        r => r['attributes'][pointerColumnName]['id'] == p.id)
      );
      return p
    })
  }
  /**
   * 从云端获取商品列表页面数据。
   */
  static async _getProdListData(param) {
    let prods = await this.getProdListWithDetail(param);
    let skus = await this.getSkuListWithDetail(prods);
    let data = this.mapPointerRelation(prods, skus);
    return data
  }
  /**
   * 上传图片
   */
  static async uploadImage(filePath, filename) {
    let picture = new AV.File(filename, {
      blob: {
        uri: filePath
      }
    })
    return await picture.save()
  }
  /**
   * 创建或修更新商品
   */
  static async createOrUpdate(data, goodsId) {
    // 删除项目
    if (data.deletedPics.length > 0) {
      let query = new AV.Query('_File');
      query.containedIn('url', data.deletedPics);
      let pics = await query.find();
      await AV.Object.destroyAll(pics)
    }
    if (data.deletedSkuIds.length > 0) {
      await AV.Object.destroyAll(
        data.deletedSkuIds.map(id => new AV.Object.createWithoutData('Sku', id))
      )
    }
    // 处理商品。
    let prod;
    if (goodsId) {
      prod = new AV.Object.createWithoutData('Prod', goodsId);
    } else {
      prod = new AV.Object('Prod');
    }
    prod.set('name', data.name);
    prod.set('feat', data.feat);
    prod.set('pid', data.pid);
    prod.set('retailPrice', data.retailPrice);
    prod.set('isSamePrice', data.isSamePrice);
    prod.set('isOnePrice', data.isOnePrice);
    prod.set('isAllSoldOut', data.isAllSoldOut);
    prod.set('cate', data.cate)
    prod.set('brand', data.brand)
    prod.set('supplier', data.supplier)
    // 处理图片。
    prod.set('mainPicUrl', data.images[0])
    prod.set('picUrls', data.images)  // 用 url 数组代替中间表
    prod = await prod.save();
    // 处理 sku。
    let skus = []
    for (let sku of data.skuList) {
      let avSku;
      if (sku.objectId) {
        avSku = new AV.Object.createWithoutData('Sku', sku.objectId);
      } else {
        avSku = new AV.Object('Sku');
      }
      avSku.set('prod', prod)
      avSku.set('size1', sku.size1);
      avSku.set('size2', sku.size2);
      avSku.set('color', sku.color);
      avSku.set('price1', sku.price1);
      avSku.set('price2', sku.price2);
      avSku.set('price3', sku.price3);
      avSku.set('price4', sku.price4);
      avSku.set('stock', sku.stock);
      avSku.set('isSoldOut', sku.isSoldOut);
      avSku.set('name', sku.name);
      avSku.set('fullName', sku.fullName);
      skus = [...skus, avSku]
    }
    skus = await AV.Object.saveAll(skus)
    return [prod, skus]
  }
  /**
   * 删除商品
   */
  static async remove(goodsId, skuIdList, picUrls) {
    let prod = new AV.Object.createWithoutData('Prod', goodsId)
    let skus = skuIdList.map(item => new AV.Object.createWithoutData('Sku', item))
    let query = new AV.Query('_File')
    query.containedIn('url', picUrls)
    let pics = await query.find()
    return AV.Promise.all([
      AV.Object.destroyAll(pics),
      prod.destroy(),
      AV.Object.destroyAll(skus)
    ])
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
  static _processProdListItem(prod) {
    let skuList = prod.attributes.skuList
    // 无 SKU。
    if (!skuList || skuList.length < 1) {
      return prod.toJSON()
    }

    // 转成 JSON 对象，后续处理更方便。
    skuList = skuList.map(item => item.toJSON());

    // 处理显示的规格名称。
    let skuNames = [...new Set(skuList.map(item => item.color.name))].join(' ');
    let skuSizes = [...new Set(skuList.map(item => item.size1.name))].join('-');

    // 处理商品总库存
    let skuStocks = skuList.map(item => item.stock);
    if (skuStocks.length > 0) {
      var sumStock = skuStocks.reduce((total, num) => total + num);
    }

    // 处理价格区间
    let skuPrice2s = skuList.map(item => item.price2);
    let maxPrice = Math.max(...skuPrice2s).toFixed(2);
    let minPrice = Math.min(...skuPrice2s).toFixed(2);

    prod.set('skuList', skuList);
    prod.set('stock', sumStock);
    prod.set('skuColorsTxt', skuNames);
    prod.set('skuSizesTxt', skuSizes);
    if (maxPrice != minPrice) {
      prod.set('priceText', `￥${minPrice} ~ ${maxPrice}`);
    } else {
      prod.set('priceText', `￥${minPrice}`);
    }

    // 转成 JSON 对象，模板取值更方便。
    prod = prod.toJSON()
  }
}
