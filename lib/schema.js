"use strict";
module.exports = function(){
	return {
		init: function(sandbox, then){
			try {
				this.sandbox = sandbox;
				sandbox.user = sandbox.context.get('user');
				sandbox._id = sandbox.context.get('parameters')._id;
    	        sandbox.operation = sandbox._id ? "update" : "insert";
				sandbox.collection = sandbox.context.get('parameters').collection;
				sandbox.schema = sandbox.context.get("service").model(sandbox.collection);
				var db = sandbox.schema.storage ? sandbox.schema.storage : "local";
				sandbox.storage = sandbox.context.get('storage').get(db);
				this.inherit(sandbox.schema);
				this.expand(sandbox.schema);
				this.whitelist(sandbox.schema.fields);
				sandbox.model = this.model(sandbox.schema);
				then(null, sandbox);
			}catch(error){
				then(error.stack, null);
			}
		},
		inherit: function(schema){
			if(!schema.inherits)
				return;
			schema.inherits = typeof schema.inherits == "string" ? [schema.inherits] : schema.inherits;
			for(var i in schema.inherits){
				var ancestor = this.sandbox.context.get("service").model(schema.inherits[i]);
				if(ancestor.inherits)
					this.inherit(ancestor);
				var j = new Number(ancestor.fields.length);
				while(j--){
					for(var k in schema.fields){
						if(ancestor.fields[j].name == schema.fields[k].name)
							continue;
						schema.fields.unshift(ancestor.fields[j]);
						break;
					}
				}
			}
		},
		expand: function(schema){
			for(var i in schema.fields){
				var field = schema.fields[i];
				if(!field.model || typeof field.model != 'string')
					continue;
				schema.fields[i].model = this.sandbox.context.get("service").model(field.model);
				this.inherit(schema.fields[i].model);
			}
		},
		model: function(schema){
			var model = {};
			for(var i in schema.fields){
				var field = schema.fields[i];
				var value = field.defaults ? field.defaults : null;
				if(field.generate)
					if(field.generate.operation == this.sandbox.operation)
						value = this.value(field.generate.type);
				if(field.name == "author")
					value = this.sandbox.user.get("_id");
				if(field.name == "site")
					value = this.sandbox.context.get('site')._id;
				model[field.name] = field.model ? this.model(field.model) :  value;
			}
			return model;
		},
        whitelist: function(fields){
            for(var i in fields){
                var field = fields[i];
                if(field.fields)
                    this.secureFields(field.fields);
                if(!field.permission)
                    continue;
                var permission = this.schema.permission.name + '.' + field.permission.name + '.' + this.sandbox.operation + '.permission';
                if(!this.user.hasPermission(permission))
                    delete fields[i];
            }
            return this;
        },
        rules: function(schema){
            var rules = {};
            for(var i in schema.fields){
                var field = schema.fields[i];
                rules[field.name] = field.model ? this.rules(field.model) : field.validation ? field.validation : [];
            }
            return rules;
        },
		value: function(type){
			return this.sandbox.context.get("storage")[type]();
		}
	};
};
