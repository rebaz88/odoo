# -*- coding: utf-8 -*-
# Part of BrowseInfo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models, _
from datetime import datetime, timedelta
from odoo.exceptions import UserError
from odoo.tools import float_is_zero, float_compare, DEFAULT_SERVER_DATETIME_FORMAT
from odoo import SUPERUSER_ID
from functools import partial



class ProductPack(models.Model):
	_name = 'product.pack'

	bi_product_template = fields.Many2one(comodel_name='product.template', string='Product pack')
	bi_product_product = fields.Many2one(comodel_name='product.product', string='Product pack',related='bi_product_template.product_variant_id')
	name = fields.Char(related='category_id.name', readonly="1")
	is_required = fields.Boolean('Required')
	category_id = fields.Many2one('pos.category','Category',required=True)
	product_ids = fields.Many2many(comodel_name='product.product', string='Product', required=True,domain="[('pos_categ_id','=', category_id)]")
	qty = fields.Float('Quantity', digits='Product Unit of Measure', default=1)

class pos_config(models.Model):
	_inherit = 'pos.config'
	
	use_combo = fields.Boolean('Use combo in POS')


class ProductProduct(models.Model):
	_inherit = 'product.template'

	is_pack = fields.Boolean(string='Is Combo Product')
	pack_ids = fields.One2many(comodel_name='product.pack', inverse_name='bi_product_template', string='Product pack')

	@api.model
	def create(self,vals):
		total = 0
		res = super(ProductProduct,self).create(vals)
		if 'pack_ids' in vals:
			for line in res.pack_ids:
				if line.is_required:
					for product in line.product_ids:
						price = product.list_price
						total += price
		if total > 0:
			res.list_price = total
		return res


	def write(self,vals):
		total = 0
		res = super(ProductProduct, self).write(vals)
		if 'pack_ids' in vals:
			for line in self.pack_ids:
				if line.is_required:
					for product in line.product_ids:
						price = product.list_price
						total += price
		if total > 0:
			self.list_price = total
		return res


class pos_order(models.Model):
	_inherit = 'pos.order'

	@api.model
	def _process_order(self, order, draft, existing_order):
		"""Create or update an pos.order from a given dictionary.

		:param pos_order: dictionary representing the order.
		:type pos_order: dict.
		:param draft: Indicate that the pos_order is not validated yet.
		:type draft: bool.
		:param existing_order: order to be updated or False.
		:type existing_order: pos.order.
		:returns number pos_order id
		"""
		order = order['data']
		pos_session = self.env['pos.session'].browse(order['pos_session_id'])
		if pos_session.state == 'closing_control' or pos_session.state == 'closed':
			order['pos_session_id'] = self._get_valid_session(order).id
		pos_order = False
		if not existing_order:
			pos_order = self.create(self._order_fields(order))
		else:
			pos_order = existing_order
			pos_order.lines.unlink()
			order['user_id'] = pos_order.user_id.id
			pos_order.write(self._order_fields(order))
		vals = {}
		print(pos_order)
		if order['lines']:
			for l in order['lines']:
				if 'is_pack' in l[2]:
					if l[2]['is_pack']:
						for prod in l[2]['combo_prod_ids']:	
							product_id = self.env['product.product'].browse(prod)
							combo_product_packs = self.env['product.product'].search([
								('date_order', '=', start),
                				('date_order', '=', end),
							])
							self.env['pos.order.line'].create({
										'name':self.env['ir.sequence'].next_by_code('pos.order.line'),
										'discount': 0, 
										'product_id': product_id.id,
										'price_subtotal': 0,
										'price_unit': 0,
										'order_id' : pos_order.id,
										'qty': l[2]['qty'],
										'price_subtotal_incl': 0,
								})		

		self._process_payment_lines(order, pos_order, pos_session, draft)

		if not draft:
			try:
				pos_order.action_pos_order_paid()
			except psycopg2.DatabaseError:
				# do not hide transactional errors, the order(s) won't be saved!
				raise
			except Exception as e:
				_logger.error('Could not fully process the POS Order: %s', tools.ustr(e))

		if pos_order.to_invoice and pos_order.state == 'paid':
			pos_order.action_pos_order_invoice()
			pos_order.account_move.sudo().with_context(force_company=self.env.user.company_id.id).post()

		return pos_order.id	
	
# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:
