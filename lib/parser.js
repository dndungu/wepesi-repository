"use strict";
module.exports = function(){
	return {
		init: function(sandbox, then){
			var self = this;
			self.sandbox = sandbox;
			self.transfer(function(error, data){
				if(!data)
					return then("No data received", null);
				sandbox.data = JSON.parse(data);
				sandbox.data = self.filter(sandbox.data, sandbox.model);
				sandbox.data = self.generate(sandbox.data, sandbox.model);
				then(null, sandbox);
			});
		},
		transfer: function(then){
			var request = this.sandbox.context.get('request');
			var buffer = [];
            request.on("data", function(chunk){
                buffer.push(chunk.toString());
            });
			request.on("end", function(){
				then(null, buffer.join());
			});			
		},
        filter: function(data, model){
            data = data instanceof Array ? data : [data];
            for(var i in data){
                for(var j in data[i]){
                    if(model.hasOwnProperty(j))
                        if(["string", "boolean", "number"].indexOf(typeof data[i][j]) == -1 && model[j])
                            this.filter(data[i][j], model[j]);
                    if(!model.hasOwnProperty(j))
                        delete data[i][j];
                }
            }
            return data;
        },
        generate: function(data, model){
            for(var i in data){
                for(var j in model){
                    if(model[j] === null)
                        continue;
                    var nested = ['string', 'number', 'boolean'].indexOf(typeof model[j]) === -1;
                    if(nested)
                        this.generate(data[i][j], model[j]);
                    if(!nested && data[i][j] == undefined)
                        data[i][j] = model[j];
                }
            }
            return data;
        }		
	};
};
