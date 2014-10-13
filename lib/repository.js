"use strict";
var collection = require(__dirname + "/collection.js");
module.exports = {
	"get" : function(context, then){
		try {
			var sandbox = { context : context};
			var qs = sandbox.context.get("query");
			var sort = { creation_time: -1 };
			var limit = qs.limit ? Number(qs.limit) : 100;
			var query = {};
			var subject = new collection();
			subject.init(sandbox, function(error, sandbox){
				if(error)
					then(error, null);
				else
					subject.find(sandbox, then);
			});
		}catch(error){
			then(error, null);
		}
	},
    "post" : function(context, then){
        try {
            var sandbox = { context : context};
            var subject = new collection();
            subject.init(sandbox, function(error, sandbox){
                if(error)
                    then(error, null);
                else
                    subject[sandbox.operation](sandbox, then);
            });
        }catch(error){
            then(error, null);
        }
    },
	"put" : function(context, then){
		return this.put(context, then);
	},
	"delete" : function(context, then){
		try {
			var sandbox = { context : context};
			var subject = new collection();
			subject.init(sandbox, function(error, sandbox){
				if(error)
					then(error, null);
				else
					subject.remove(sandbox, then);
			});
		}catch(error){
			then(error, null);
		}
	}
};
