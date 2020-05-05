# -*- coding: utf-8 -*-
# from odoo import http


# class WelcomeScreen(http.Controller):
#     @http.route('/welcome_screen/welcome_screen/', auth='public')
#     def index(self, **kw):
#         return "Hello, world"

#     @http.route('/welcome_screen/welcome_screen/objects/', auth='public')
#     def list(self, **kw):
#         return http.request.render('welcome_screen.listing', {
#             'root': '/welcome_screen/welcome_screen',
#             'objects': http.request.env['welcome_screen.welcome_screen'].search([]),
#         })

#     @http.route('/welcome_screen/welcome_screen/objects/<model("welcome_screen.welcome_screen"):obj>/', auth='public')
#     def object(self, obj, **kw):
#         return http.request.render('welcome_screen.object', {
#             'object': obj
#         })
