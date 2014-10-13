"use strict";
module.exports = function(){
	return {
		init: function(sandbox, then){
			var policy = sandbox.schema.permission ? sandbox.schema.permission : { permission : "public.permission", mode : 3 };
			if(sandbox.user.hasPermission(policy.permission))
				then(null, sandbox);
			else
				then("You are not allowed access to this resource.", null);
		}
	};
};
