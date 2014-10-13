"use strict";
var schema = require(__dirname + "/schema.js");
var parser = require(__dirname + "/parser.js");
var authenticator = require(__dirname + "/authenticator.js");
var validator = require(__dirname + "/validator.js");
module.exports = function(){
	return {
		init : function(sandbox, then){
			this.sandbox = sandbox;
            try {
                (new schema()).init(sandbox, function(error, sandbox){
                    if(error)
                        return then(error, null);
                    (new authenticator()).init(sandbox, function(error, sandbox){
                        if(error)
                            then(error, null);
                        else
                            then(null, sandbox);
                    });
                });
            }catch(error){
                sandbox.context.log(error.stack);
                then(error, null);
            }			
		},
		insert : function(sandbox, then){
			try{
				(new parser()).init(sandbox, function(error, sandbox){
					if(error)
						return then(error, null);
					var collection = sandbox.storage.collection(sandbox.schema.name);
					collection.insert(sandbox.data, then);
				});
			}catch(error){
                sandbox.context.log(error.stack);
                then(error.toString(), null);
			}
		},
		find : function(sandbox, then){
			try {
				var qs = sandbox.context.get("query");
				var sort = { creation_time: -1 };
				var limit = qs.limit ? Number(qs.limit) : 100;
				var query = {};
				if(qs.starting_after)
					query._id = { $gt : qs.starting_after};
				if(qs.starting_before)
					query._id = { $lt : qs.starting_before};
				if(sandbox._id)
					query._id = sandbox._id;
				var collection = sandbox.storage.collection(sandbox.schema.name);
				collection.find(query).sort(sort).limit(limit).toArray(function(error, data){
					if(error)
						then(error, null);
					else
						then(null, { has_more : (limit == data.length), data : data });
				});
			}catch(error){
				sandbox.context.log(error.stack);
				then(error, null);
			}		
		},
		update : function(sandbox, then){
			try{
				var self = this;
				(new parser()).init(sandbox, function(error, sandbox){
					if(error)
						return then(error, null);
					var collection = sandbox.storage.collection(sandbox.schema.name);
					var query = { _id : sandbox._id };
					collection.update(query, sandbox.data[0], function(error, affected){
						if(error)
							then(error, null);
						else
							self.find(sandbox, then);
					});
				});
			}catch(error){
				sandbox.context.log(error.stack);
				then(error.toString(), null);
			}
		},
		remove : function(sandbox, then){
			try {
				var query = { _id : sandbox._id };
				var collection = sandbox.storage.collection(sandbox.schema.name);
				collection.remove(query, function(error, data){
					if(error)
						then(error, null);
					else
						then(null, { "deleted" : true, "_id" : sandbox._id });
				});
			}catch(error){
				sandbox.context.log(error.stack);
				then(error.toString(), null);
			}			
		},
		validate : function(data, rules, model){
            data = data instanceof Array ? data : [data];
            for(var i in data){
                for(var j in model){
                    if(rules[j] instanceof Array && rules[j].indexOf('required') == -1)
                        continue;
                    var children = !(rules[j] instanceof Array);
                    var value = data[i][j] ? data[i][j] : {};
                    if(children)
                        if(!this.validate(value, rules[j], model[j]))
                            return false;
                    if(children)
                        continue;
                    for(var k in rules[j]){
                        if(this.validator.test(rules[j][k], data[i][j]) || (j == "_id" && this.sandbox.operation == "update"))
                            continue;
                        this.sandbox.context.log(4, j + ' has failed validation test, expecting ' + rules[j][k] + ' but received ' + data[i][j]);
                        return false;
                    }
                }
            }
            return true;
		}
	};
};
