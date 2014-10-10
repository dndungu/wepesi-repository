"use strict";
module.exports = {
	"get": function(context, then){
		try{
			var sandbox = { context : context };
			sandbox.operation = "find";
			var model = new (require(__dirname + "/lib/model.js"));
			model.init(sandbox);
            if(!model.allow)
                sandbox.context.statusCode(401);
			if(!model.allow)
				throw new Error("You are not allowed access to this resource.");
			if(sandbox._id)
				model.query._id = sandbox._id;
			model.collection.find(model.query).sort({creation_time: -1}).toArray(then);
		}catch(error){
			then(error.toString(), null);
			context.log(2, error.stack);
		}
	},
	"post": function(context, then){
		try{
			var sandbox = {context : context};
			var model = new (require(__dirname + "/lib/model.js"));
			model.init(sandbox);
            if(!model.allow)
                sandbox.context.statusCode(401);
            if(!model.allow)
                throw new Error("User is not allowed write access to this resource.");
            if(sandbox._id)
                model.query._id = sandbox._id;
			model[sandbox.operation](then);
		}catch(error){
			then(error.toString(), null);
			sandbox.context.log(2, error.stack);
		}
	},
	"delete": function(context, then){
		try{
			var sandbox = {context : context};
			sandbox.operation = "remove";
			var model = new (require(__dirname + "/lib/model.js"));
			model.init(sandbox);
            if(!model.allow)
                sandbox.context.statusCode(401);
            if(!model.allow)
                throw new Error("You are not allowed to delete this resource.");
            if(sandbox._id)
                model.query._id = sandbox._id;
			model.collection.remove(query, then);
		}catch(error){
            then(error.toString(), null);
            sandbox.context.log(2, error.stack);
		}
	},
	"put": function(sandbox){
		//TODO
	}
};
