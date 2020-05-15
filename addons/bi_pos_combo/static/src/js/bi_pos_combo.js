// pos_product_bundle_pack js
odoo.define('bi_pos_combo.pos', function(require) {
	"use strict";

	var models = require('point_of_sale.models');
	var screens = require('point_of_sale.screens');
	var core = require('web.core');
	var gui = require('point_of_sale.gui');
	var popups = require('point_of_sale.popups');
	var utils = require('web.utils');
	var _t = core._t;
	var round_di = utils.round_decimals;
	var round_pr = utils.round_precision;
	var QWeb = core.qweb;
	var exports = {};


	var _super_posmodel = models.PosModel.prototype;
	models.PosModel = models.PosModel.extend({
		initialize: function (session, attributes) {
			var product_model = _.find(this.models, function(model){ return model.model === 'product.product'; });
			product_model.fields.push('is_pack','pack_ids');
			return _super_posmodel.initialize.call(this, session, attributes);
		},
	});

	models.load_models({
		model: 'product.pack',
		fields: ['product_ids', 'is_required', 'qty', 'category_id','bi_product_product','bi_product_template','name'],
		domain: null,
		loaded: function(self, pos_product_pack) {
			self.pos_product_pack = pos_product_pack;
			self.set({
				'pos_product_pack': pos_product_pack
			});
		},
	});

	screens.ProductListWidget.include({

		// renderElement: function() {
		// 	var el_str  = QWeb.render(this.template, {widget: this});
		// 	var el_node = document.createElement('div');
		// 		el_node.innerHTML = el_str;
		// 		el_node = el_node.childNodes[1];

		// 	if(this.el && this.el.parentNode){
		// 		this.el.parentNode.replaceChild(el_node,this.el);
		// 	}
		// 	this.el = el_node;
		// 	var self = this;
		// 	var list_container = el_node.querySelector('.product-list');
		// 	for(var i = 0, len = this.product_list.length; i < len; i++){
		// 		var prod = this.product_list[i]
		// 		if(prod.is_pack == true)
		// 		{
		// 			if(self.pos.config.use_combo == true)
		// 			{
		// 				var product_node = this.render_product(this.product_list[i]);
		// 			}
		// 		}
		// 		else{
		// 			var product_node = this.render_product(this.product_list[i]);
		// 		}
		// 		if(product_node){
		// 			product_node.addEventListener('click',this.click_product_handler);
		// 			product_node.addEventListener('keypress',this.keypress_product_handler);
		// 			list_container.appendChild(product_node);	
		// 		}
		// 	}
		// },

	});
	screens.ProductCategoriesWidget.include({
		perform_search: function(category, query, buy_result){
	        var products;
	        var self = this
	        if(query){
	            products = this.pos.db.search_product_in_category(category.id,query);
	            if(buy_result && products.length === 1){
	            	if(products[0].is_pack){
	                    if(this.pos.config.use_combo){
	                    	var required_products = [];
							var optional_products = [];
							var combo_products = this.pos.pos_product_pack;
							if(products)
							{
								for (var i = 0; i < combo_products.length; i++) {
									if(combo_products[i]['bi_product_product'][0] == products[0].id)
									{
										if(combo_products[i]['is_required'])
										{
											combo_products[i]['product_ids'].forEach(function (prod) {
												var sub_product = self.pos.db.get_product_by_id(prod);
												required_products.push(sub_product)
											});
										}
										else{
											combo_products[i]['product_ids'].forEach(function (prod) {
												var sub_product = self.pos.db.get_product_by_id(prod);
												optional_products.push(sub_product)
											});
										}
									}
								}
							}
							self.gui.show_popup('select_combo_product_widget', {'product': products[0],'required_products':required_products,'optional_products':optional_products , 'update_line' :false });
	                    	this.clear_search();
	                    }else{
	                    	this.gui.show_popup('error',{
				                    'title': _t('Error: Could not Added Combo product in orderlines'),
				                    'body': 'Product is combo, product not available for this session.',
				                });
	                    	this.clear_search();
	                    }
	            	}else{
	            			this.pos.get_order().add_product(products[0]);
	                    	this.clear_search();
	             	}       
	            }else{
	                this.product_list_widget.set_product_list(products, query);
	            }
	        }else{
	            products = this.pos.db.get_product_by_category(this.category.id);
	            this.product_list_widget.set_product_list(products, query);
	        }
	    },
	});	

	screens.ProductScreenWidget.include({
		// click_product: function(product) {
		// 	var self = this;
		// 	if(product.to_weight && this.pos.config.iface_electronic_scale){
		// 		this.gui.show_screen('scale',{product: product});
		// 	}else{
		// 		if(product.is_pack)
		// 		{
		// 			var required_products = [];
		// 			var optional_products = [];
		// 			var combo_products = self.pos.pos_product_pack;
		// 			if(product)
		// 			{
		// 				for (var i = 0; i < combo_products.length; i++) {
		// 					if(combo_products[i]['bi_product_product'][0] == product['id'])
		// 					{
		// 						if(combo_products[i]['is_required'])
		// 						{
		// 							combo_products[i]['product_ids'].forEach(function (prod) {
		// 								var sub_product = self.pos.db.get_product_by_id(prod);
		// 								required_products.push(sub_product)
		// 							});
		// 						}
		// 						else{
		// 							combo_products[i]['product_ids'].forEach(function (prod) {
		// 								var sub_product = self.pos.db.get_product_by_id(prod);
		// 								optional_products.push(sub_product)
		// 							});
		// 						}
		// 					}
		// 				}
		// 			}
		// 			self.gui.show_popup('select_combo_product_widget', {'product': product,'required_products':required_products,'optional_products':optional_products , 'update_line' : false });
		// 		}
		// 		else{
		// 			this.pos.get_order().add_product(product);
		// 		}
		// 	}
		// },

	});

	screens.OrderWidget.include({
		render_orderline: function(orderline){
			var self = this;
			var el_str  = QWeb.render('Orderline',{widget:this, line:orderline}); 
			var el_node = document.createElement('div');
				el_node.innerHTML = _.str.trim(el_str);
				el_node = el_node.childNodes[0];
				el_node.orderline = orderline;
				el_node.addEventListener('click',this.line_click_handler);
			var el_lot_icon = el_node.querySelector('.line-lot-icon');
			if(el_lot_icon){
				el_lot_icon.addEventListener('click', (function() {
					this.show_product_lot(orderline);
				}.bind(this)));
			}
			var el_combo_icon = el_node.querySelector('.edit-combo');
			if(el_combo_icon){
				el_combo_icon.addEventListener('click', (function() {
					var product = orderline.product
					var required_products = [];
					var optional_products = [];
					var combo_products = self.pos.pos_product_pack;
					if(product)
					{
						for (var i = 0; i < combo_products.length; i++) {
							if(combo_products[i]['bi_product_product'][0] == product['id'])
							{
								if(combo_products[i]['is_required'])
								{
									combo_products[i]['product_ids'].forEach(function (prod) {
										var sub_product = self.pos.db.get_product_by_id(prod);
										required_products.push(sub_product)
									});
								}
								else{
									combo_products[i]['product_ids'].forEach(function (prod) {
										var sub_product = self.pos.db.get_product_by_id(prod);
										optional_products.push(sub_product)
									});
								}
							}
						}
					}

					self.gui.show_popup('select_combo_product_widget', {'product': product,'required_products':required_products,'optional_products':optional_products , 'update_line' : true });
				}.bind(this)));
			}

			orderline.node = el_node;
			return el_node;
		},
	});

	var SelectComboProductPopupWidget = popups.extend({
		template: 'SelectComboProductPopupWidget',
		init: function(parent, args) {
			this._super(parent, args);
			this.options = {};
		},

		show: function(options) {
			options = options || {};
			var self = this;
			this._super(options);
		},

		get_product_image_url: function(product){
			return window.location.origin + '/web/image?model=product.product&field=image_medium&id='+product.id;
		},
		
		renderElement: function() {
			var self = this;
			this._super();
			var order = self.pos.get_order();
			var orderlines = order.get_orderlines();
			this.product = self.options.product;
			this.update_line = self.options.update_line;
			this.required_products = self.options.required_products;
			this.optional_products = self.options.optional_products;
			this.combo_products = self.pos.pos_product_pack;
			var final_products = this.required_products;

			$('.optional-product').each(function(){
				$('.raghav').removeClass('raghav');
				$(this).on('click',function () {
					if ( $(this).hasClass('raghav') )
					{
						$(this).removeClass('raghav');
					}
					else{
						$(this).addClass('raghav');	
					}
				});
			});

			this.$('.remove-product').click(function(ev){
				ev.stopPropagation();
				ev.preventDefault();   
				var prod_id = parseInt(this.dataset.productId);
				$(this).closest(".optional-product").hide();
				for (var i = 0; i < self.optional_products.length; i++) 
				{
					if(self.optional_products[i]['id'] == prod_id)
					{
						self.optional_products.splice(i, 1); 
					}
				}
			});

			this.$('.confirm-add').click(function(ev){
				ev.stopPropagation();
				ev.preventDefault();   
				$('.raghav').each(function(){
					var prod_id = parseInt(this.dataset.productId);
					for (var i = 0; i < self.optional_products.length; i++) 
					{
						if(self.optional_products[i]['id'] == prod_id)
						{
							final_products.push(self.optional_products[i]); 
						}
					}
					
				});
				var add = [];
				var new_prod = [self.product.id,final_products];
				if(self.pos.get('final_products'))
				{
					add.push(self.pos.get('final_products'))
					add.push(new_prod)
					self.pos.set({
						'final_products': add,
					});
				}
				else{
					add.push(new_prod)
					self.pos.set({
						'final_products': add,
					});
				}
				var selected_line = null;
				if(self.update_line){
					orderlines.forEach(function (line) {
					if(line.selected == true)
					{
						if(line.product.id == self.product.id)
						{
							selected_line = line;
							}
						}
					});
				if(selected_line != null)
					{
					selected_line.set_combo_products(final_products)
					}
					else{
					order.add_product(self.product);
					}
				}else{
					order.add_product(self.product);
				}
				self.gui.close_popup();
			});
		},
	});
	gui.define_popup({
		name: 'select_combo_product_widget',
		widget: SelectComboProductPopupWidget
	});

var orderline_id = 1;

// exports.Orderline = Backbone.Model.extend ...
	var _super_orderline = models.Orderline.prototype;
	models.Orderline = models.Orderline.extend({
		initialize: function(attr,options){
			_super_orderline.initialize.apply(this, arguments);
			this.combo_products = this.combo_products;

			var final_data = this.pos.get('final_products')
			if(final_data)
			{
				for (var i = 0; i < final_data.length; i++) {
					if(final_data[i][0] == this.product.id)
					{
						this.combo_products = final_data[i][1];
						this.pos.set({
							'final_products': null,
						});
					}
				}
			}
			
			this.set_combo_products(this.combo_products);
			this.combo_prod_ids =  this.combo_prod_ids;
			this.is_pack = this.is_pack;
		},
		
		clone: function(){
			var orderline = new models.Orderline({},{
				pos: this.pos,
				order: this.order,
				product: this.product,
				price: this.price,
			});
			orderline.order = null;
			orderline.combo_prod_ids = this.combo_prod_ids;
			orderline.combo_products = this.combo_products;
			orderline.quantity = this.quantity;
			orderline.quantityStr = this.quantityStr;
			orderline.discount = this.discount;
			orderline.price = this.price;
			orderline.type = this.type;
			orderline.selected = false;
			orderline.is_pack = this.is_pack;
			orderline.price_manually_set = this.price_manually_set;
			return orderline;
		},

		// init_from_JSON: function(json) {
		// 	this.product = this.pos.db.get_product_by_id(json.product_id);
		// 	if (!this.product) {
		// 		console.error('ERROR: attempting to recover product ID', json.product_id,
		// 			'not available in the point of sale. Correct the product or clean the browser cache.');
		// 	}
		// 	this.set_product_lot(this.product);
		// 	this.price = json.price_unit;
		// 	this.set_discount(json.discount);
		// 	this.set_combo_products(json.combo_products);
		// 	this.combo_prod_ids = json.combo_prod_ids;
		// 	this.is_pack = json.is_pack;
		// 	this.set_quantity(json.qty, 'do not recompute unit price');
		// 	this.id    = json.id;
		// 	if(this.is_pack == true)
		// 	{
		// 		this.set_combo_price(this.price)
		// 	}
		// 	orderline_id = Math.max(this.id+1,orderline_id);
		// 	var pack_lot_lines = json.pack_lot_ids;
		// 	for (var i = 0; i < pack_lot_lines.length; i++) {
		// 		var packlotline = pack_lot_lines[i][2];
		// 		var pack_lot_line = new models.Packlotline({}, {'json': _.extend(packlotline, {'order_line':this})});
		// 		this.pack_lot_lines.add(pack_lot_line);
		// 	}
		// },
		init_from_JSON: function(json) {
			_super_orderline.init_from_JSON.apply(this, arguments);
			this.set_combo_products(json.combo_products);
			this.combo_prod_ids = json.combo_prod_ids;
			this.is_pack = json.is_pack;
			this.set_quantity(json.qty, 'do not recompute unit price');
			this.id    = json.id;
			if(this.is_pack == true)
			{
				this.set_combo_price(this.price)
			}
		},

		export_for_printing: function () {
			var json = _super_orderline.export_for_printing.apply(this, arguments);
			json.is_pack = this.is_pack;
			json.combo_products = this.get_combo_products();
            return json;
		},
		
		// export_for_printing: function(){
	    //     return {
	    //         quantity:           this.get_quantity(),
	    //         unit_name:          this.get_unit().name,
	    //         price:              this.get_unit_display_price(),
	    //         discount:           this.get_discount(),
	    //         product_name:       this.get_product().display_name,
	    //         product_name_wrapped: this.generate_wrapped_product_name(),
	    //         price_lst:          this.get_lst_price(),
	    //         display_discount_policy:    this.display_discount_policy(),
	    //         price_display_one:  this.get_display_price_one(),
	    //         price_display :     this.get_display_price(),
	    //         price_with_tax :    this.get_price_with_tax(),
	    //         price_without_tax:  this.get_price_without_tax(),
	    //         price_with_tax_before_discount:  this.get_price_with_tax_before_discount(),
	    //         tax:                this.get_tax(),
	    //         is_pack:this.is_pack,
	    //         combo_products : this.get_combo_products(),
	    //         product_description:      this.get_product().description,
	    //         product_description_sale: this.get_product().description_sale,
	    //     };
	    // },

		export_as_JSON: function () {
			var json = _super_orderline.export_as_JSON.apply(this, arguments);
			
            json.combo_products = this.get_combo_products();
            json.combo_prod_ids = this.combo_prod_ids;
			json.is_pack = this.is_pack;
			
            return json;
		},
		
		// export_as_JSON: function() {
		// 	var pack_lot_ids = [];
		// 	if (this.has_product_lot){
		// 		this.pack_lot_lines.each(_.bind( function(item) {
		// 			return pack_lot_ids.push([0, 0, item.export_as_JSON()]);
		// 		}, this));
		// 	}
		// 	return {
		// 		qty: this.get_quantity(),
		// 		price_unit: this.get_unit_price(),
		// 		price_subtotal: this.get_price_without_tax(),
		// 		price_subtotal_incl: this.get_price_with_tax(),
		// 		discount: this.get_discount(),
		// 		product_id: this.get_product().id,
		// 		tax_ids: [[6, false, _.map(this.get_applicable_taxes(), function(tax){ return tax.id; })]],
		// 		id: this.id,
		// 		pack_lot_ids: pack_lot_ids,
		// 		combo_products : this.get_combo_products(),
		// 		combo_prod_ids: this.combo_prod_ids,
		// 		is_pack:this.is_pack,
		// 	};
		// },

		set_combo_products: function(products) {
			var ids = [];
			if(this.product.is_pack)
			{
				if(products)
				{
					products.forEach(function (prod) {
						if(prod != null)
						{
							ids.push(prod.id)
						}
					});
				}
				this.combo_products = products;
				this.combo_prod_ids  = ids;
				if(this.combo_prod_ids)
				{
					this.set_combo_price(this.price);
				}
				this.trigger('change',this);
			}
			
		},

		set_unit_price: function(price){
			this.order.assert_editable();
			if(this.product.is_pack)
			{
				// this.combo_prod_ids
				this.is_pack = true;
				var prods = this.get_combo_products()
				var total = 0;
				if(prods)
				{
					prods.forEach(function (prod) {
						if(prod)
						{
							total += prod.lst_price	
						}	
					});
				}
				this.price = round_di(parseFloat(total) || 0, this.pos.dp['Product Price']);
			}
			else{
				this.price = round_di(parseFloat(price) || 0, this.pos.dp['Product Price']);
			}
			this.trigger('change',this);
		},

		set_combo_price: function(price){
			var prods = this.get_combo_products()
			var total = 0;
			prods.forEach(function (prod) {
				if(prod)
				{
					total += prod.lst_price	
				}	
			});

			this.set_unit_price(total)
			this.trigger('change',this);
		},

		
		// Pass Bundle Pack Products in Orderline WIdget.
		get_combo_products: function() {
			self = this;
			if(this.product.is_pack)
			{
				this.is_pack = true;
				var get_sub_prods = [];
				if(this.combo_prod_ids)
				{
					this.combo_prod_ids.forEach(function (prod) {
						var sub_product = self.pos.db.get_product_by_id(prod);
						get_sub_prods.push(sub_product)
					});
					return get_sub_prods;
				}
				if(this.combo_products)
				{
					if(! null in this.combo_products){
						return this.combo_products
					}
				}
			}
			
		},
	});
});
