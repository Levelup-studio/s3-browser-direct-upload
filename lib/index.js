var S3Client, _, crypto, mime, moment,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

_ = require('lodash');

mime = require('mime');

moment = require('moment');

crypto = require('crypto');

S3Client = (function() {
  function S3Client(options, arrAllowedDataExtensions) {
    var aws;
    if (options == null) {
      options = {};
    }
    aws = require('aws-sdk');
    if (!(options instanceof aws.Config)) {
      this._checkOptions(options);
    }
    aws.config.update(options);
    this.s3 = new aws.S3();
    this.arrAllowedDataExtensions = null;
    if (arrAllowedDataExtensions && this._checkAllowedDataExtensions(arrAllowedDataExtensions)) {
      this.arrAllowedDataExtensions = arrAllowedDataExtensions;
    }
  }

  S3Client.prototype.uploadPostForm = function(options, cb) {
    var acl, algorithm, arrAlgorithm, bucket, conditionMatching, contentLength, contentType, dateKey, dateLongPolicy, dateRegionKey, dateRegionServiceKey, dateShortPolicy, expires, extension, hashalg, key, policy, policyDoc, ref, ref1, ref2, ref3, ref4, ref5, ref6, region, signature, signingKey, sigver, stream;
    if (options == null) {
      options = {};
    }
    if (!cb) {
      throw new Error('Callback is required');
    }
    extension = options.extension, key = options.key, bucket = options.bucket, expires = options.expires, acl = options.acl, contentLength = options.contentLength, algorithm = options.algorithm, region = options.region, conditionMatching = options.conditionMatching;
    key = options.key;
    bucket = options.bucket;
    extension = (ref = options.extension) != null ? ref : null;
    expires = (ref1 = options.expires) != null ? ref1 : moment.utc().add(60, 'minutes').toDate();
    acl = (ref2 = options.acl) != null ? ref2 : 'public-read';
    contentLength = (ref3 = options.contentLength) != null ? ref3 : null;
    algorithm = (ref4 = options.algorithm) != null ? ref4 : 'AWS4-HMAC-SHA256';
    region = (ref5 = options.region) != null ? ref5 : this.region;
    conditionMatching = (ref6 = options.conditionMatching) != null ? ref6 : null;
    if (!(key && bucket)) {
      return cb(new Error('key and bucket are required'));
    }
    if (extension) {
      contentType = this._checkDataExtension(extension);
      if (!contentType) {
        return cb(new Error('Data extension not allowed'));
      }
    }
    if (algorithm.split('-').length === 3) {
      arrAlgorithm = algorithm.split('-');
      sigver = arrAlgorithm[0];
      hashalg = arrAlgorithm[2].toLowerCase();
    } else {
      sigver = "AWS4";
      hashalg = "sha256";
    }
    policyDoc = {};
    if (expires && _.isDate(expires)) {
      policyDoc["expiration"] = moment.utc(expires).format("YYYY-MM-DD[T]HH:MM:SS[Z]");
    }
    policyDoc["conditions"] = [];
    dateShortPolicy = moment.utc().format('YYYYMMDD');
    dateLongPolicy = moment.utc().format('YYYYMMDD[T]HHMMSS[Z]');
    policyDoc.conditions.push({
      'bucket': bucket
    });
    policyDoc.conditions.push(['starts-with', '$key', key]);
    policyDoc.conditions.push({
      'acl': acl
    });
    if (contentType) {
      policyDoc.conditions.push(['starts-with', '$Content-Type', contentType]);
    }
    if (contentLength) {
      policyDoc.conditions.push(['content-length-range', 0, contentLength]);
    }
    policyDoc.conditions.push({
      "x-amz-algorithm": algorithm
    });
    policyDoc.conditions.push({
      "x-amz-credential": this.accessKeyId + "/" + dateShortPolicy + "/" + region + "/s3/aws4_request"
    });
    policyDoc.conditions.push({
      "x-amz-date": dateLongPolicy
    });
    if (conditionMatching && _.isArray(conditionMatching)) {
      policyDoc.conditions = _.union(conditionMatching, policyDoc.conditions);
    }
    dateKey = crypto.createHmac(hashalg, "" + sigver + this.secretAccessKey).update(dateShortPolicy).digest();
    dateRegionKey = crypto.createHmac(hashalg, dateKey).update(region).digest();
    dateRegionServiceKey = crypto.createHmac(hashalg, dateRegionKey).update('s3').digest();
    signingKey = crypto.createHmac(hashalg, dateRegionServiceKey).update((sigver.toLowerCase()) + "_request").digest();
    policy = new Buffer(JSON.stringify(policyDoc)).toString('base64');
    signature = crypto.createHmac(hashalg, signingKey).update(policy).digest('hex');
    stream = {};
    stream['params'] = {
      "key": key,
      "acl": acl,
      "x-amz-algorithm": algorithm,
      "x-amz-credential": this.accessKeyId + "/" + dateShortPolicy + "/" + region + "/s3/" + (sigver.toLowerCase()) + "_request",
      "x-amz-date": dateLongPolicy,
      "policy": policy,
      "x-amz-signature": signature
    };
    if (contentType) {
      stream.params['content-type'] = contentType;
    }
    if (conditionMatching) {
      stream['conditions'] = conditionMatching;
    }
    if (options.s3ForcePathStyle) {
      stream['public_url'] = "https://s3.amazonaws.com/" + bucket + "/" + key;
      stream['form_url'] = "https://s3.amazonaws.com/" + bucket + "/";
    } else {
      stream['public_url'] = "https://" + bucket + ".s3.amazonaws.com/" + key;
      stream['form_url'] = "https://" + bucket + ".s3.amazonaws.com/";
    }
    return cb(null, stream);
  };

  S3Client.prototype.upload = function(options, cb) {
    var acl, bucket, contentLength, contentType, data, expires, extension, key, params, ref, ref1, ref2, ref3;
    if (options == null) {
      options = {};
    }
    if (!cb) {
      throw new Error('Callback is required');
    }
    data = options.data, extension = options.extension, key = options.key, bucket = options.bucket, expires = options.expires, acl = options.acl, contentLength = options.contentLength;
    data = options.data;
    key = options.key;
    bucket = options.bucket;
    extension = (ref = options.extension) != null ? ref : null;
    expires = (ref1 = options.expires) != null ? ref1 : null;
    acl = (ref2 = options.acl) != null ? ref2 : null;
    contentLength = (ref3 = options.contentLength) != null ? ref3 : null;
    if (!(data && key && bucket)) {
      return cb(new Error('data, key and bucket are required'));
    }
    params = {
      Bucket: bucket,
      Key: key,
      Body: data
    };
    if (extension) {
      contentType = this._checkDataExtension(extension);
      if (!contentType) {
        return cb(new Error('Data extension not allowed'));
      }
      params["ContentType"] = contentType;
    }
    if (expires && _.isDate(expires)) {
      params["Expires"] = moment.utc(expires);
    }
    if (acl) {
      params["ACL"] = acl;
    }
    if (contentLength) {
      params["ContentLength"] = contentLength;
    }
    return this.s3.upload(params, function(err, data) {
      if (err) {
        return cb(err);
      }
      return cb(null, "https://" + bucket + ".s3.amazonaws.com/" + key);
    });
  };

  S3Client.prototype.put = function(options, cb) {
    var acl, bucket, contentLength, contentType, expires, extension, key, params, ref, ref1, ref2;
    if (options == null) {
      options = {};
    }
    if (!cb) {
      throw new Error('Callback is required');
    }
    extension = options.extension, key = options.key, bucket = options.bucket, expires = options.expires, acl = options.acl, contentLength = options.contentLength;
    key = options.key;
    bucket = options.bucket;
    extension = (ref = options.extension) != null ? ref : null;
    expires = (ref1 = options.expires) != null ? ref1 : null;
    acl = (ref2 = options.acl) != null ? ref2 : null;
    if (!(key && bucket)) {
      return cb(new Error('key and bucket are required'));
    }
    params = {
      Bucket: bucket,
      Key: key
    };
    if (extension) {
      contentType = this._checkDataExtension(extension);
      if (!contentType) {
        return cb(new Error('Data extension not allowed'));
      }
      params["ContentType"] = contentType;
    }
    if (expires && _.isDate(expires)) {
      params["Expires"] = moment.utc(expires);
    }
    if (acl) {
      params["ACL"] = acl;
    }
    return this.s3.getSignedUrl("putObject", params, function(err, data) {
      var put;
      if (err) {
        return cb(err);
      }
      put = {
        'signed_url': data,
        'public_url': "https://" + bucket + ".s3.amazonaws.com/" + key
      };
      return cb(null, put);
    });
  };

  S3Client.prototype._checkDataExtension = function(dataExtension) {
    if (!dataExtension || (this.arrAllowedDataExtensions && indexOf.call(this.arrAllowedDataExtensions, dataExtension) < 0)) {
      return false;
    }
    return mime.lookup(dataExtension);
  };

  S3Client.prototype._checkAllowedDataExtensions = function(arrAllowedDataExtensions) {
    var ext;
    if (!arrAllowedDataExtensions) {
      return false;
    }
    if (!_.isArray(arrAllowedDataExtensions)) {
      throw new Error("Allowed data extensions must be array of strings");
    }
    for (ext in arrAllowedDataExtensions) {
      if (!_.isString(ext)) {
        throw new Error("Extensions must be a strings");
      }
    }
    return true;
  };

  S3Client.prototype._checkOptions = function(options) {
    if (options == null) {
      options = {};
    }
    this.accessKeyId = options.accessKeyId, this.secretAccessKey = options.secretAccessKey, this.region = options.region, this.signatureVersion = options.signatureVersion, this.maxRetries = options.maxRetries, this.maxRedirects = options.maxRedirects, this.systemClockOffset = options.systemClockOffset, this.sslEnabled = options.sslEnabled, this.paramValidation = options.paramValidation, this.computeChecksums = options.computeChecksums, this.convertResponseTypes = options.convertResponseTypes, this.s3ForcePathStyle = options.s3ForcePathStyle, this.s3BucketEndpoint = options.s3BucketEndpoint, this.apiVersion = options.apiVersion, this.httpOptions = options.httpOptions, this.apiVersions = options.apiVersions, this.sessionToken = options.sessionToken, this.credentials = options.credentials, this.credentialProvider = options.credentialProvider, this.logger = options.logger;
    if (!this.accessKeyId) {
      throw new Error("accessKeyId is required");
    }
    if (!this.secretAccessKey) {
      throw new Error("secretAccessKey is required");
    }
    if (!this.region) {
      throw new Error("region is required");
    }
    if (!_.isString(this.accessKeyId)) {
      throw new Error("accessKeyId must be a string");
    }
    if (!_.isString(this.secretAccessKey)) {
      throw new Error("secretAccessKey must be a string");
    }
    if (!_.isString(this.region)) {
      throw new Error("region must be a string");
    }
    if (this.signatureVersion && !_.isString(this.signatureVersion)) {
      throw new Error("signatureVersion must be a string");
    }
    if (this.maxRetries && !_.isInteger(this.maxRetries)) {
      throw new Error('maxRetries must be a integer');
    }
    if (this.maxRedirects && !_.isInteger(this.maxRedirects)) {
      throw new Error('maxRedirects must be a integer');
    }
    if (this.systemClockOffset && !_.isNumber(this.systemClockOffset)) {
      throw new Error('systemClockOffset must be a number');
    }
    if (this.sslEnabled && !_.isBoolean(this.sslEnabled)) {
      throw new Error('sslEnabled must be a boolean');
    }
    if (this.paramValidation && !_.isBoolean(this.paramValidation)) {
      throw new Error('paramValidation must be a boolean');
    }
    if (this.computeChecksums && !_.isBoolean(this.computeChecksums)) {
      throw new Error('computeChecksums must be a boolean');
    }
    if (this.convertResponseTypes && !_.isBoolean(this.convertResponseTypes)) {
      throw new Error('convertResponseTypes must be a boolean');
    }
    if (this.s3ForcePathStyle && !_.isBoolean(this.s3ForcePathStyle)) {
      throw new Error('s3ForcePathStyle must be a boolean');
    }
    if (this.s3BucketEndpoint && !_.isBoolean(this.s3BucketEndpoint)) {
      throw new Error('s3BucketEndpoint must be a boolean');
    }
    if (this.httpOptions && !_.isPlainObject(this.httpOptions)) {
      throw new Error('httpOptions must be a dict with params: proxy, agent, timeout, xhrAsync, xhrWithCredentials');
    }
    if (this.apiVersions && !_.isPlainObject(this.apiVersions)) {
      throw new Error('apiVersions must be a dict with versions');
    }
    if (this.apiVersion && !(_.isString(this.apiVersion || _.isDate(this.apiVersion)))) {
      throw new Error('apiVersion must be a string or date');
    }
    if (this.sessionToken && !this.sessionToken instanceof aws.Credentials) {
      throw new Error('sessionToken must be a AWS.Credentials');
    }
    if (this.credentials && !this.credentials instanceof aws.Credentials) {
      throw new Error('credentials must be a AWS.Credentials');
    }
    if (this.credentialProvider && !this.credentialProvider instanceof aws.CredentialsProviderChain) {
      throw new Error('credentialProvider must be a AWS.CredentialsProviderChain');
    }
    if (this.logger && !(this.logger.write && this.logger.log)) {
      throw new Error('logger must have #write or #log methods');
    }
  };

  return S3Client;

})();

module.exports = S3Client;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGliL2luZGV4LmpzIiwic291cmNlcyI6WyJsaWIvaW5kZXguY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLElBQUEsaUNBQUE7RUFBQTs7QUFBQSxDQUFBLEdBQVUsT0FBQSxDQUFRLFFBQVI7O0FBQ1YsSUFBQSxHQUFVLE9BQUEsQ0FBUSxNQUFSOztBQUNWLE1BQUEsR0FBVSxPQUFBLENBQVEsUUFBUjs7QUFDVixNQUFBLEdBQVUsT0FBQSxDQUFRLFFBQVI7O0FBR0o7RUFDUyxrQkFBQyxPQUFELEVBQWUsd0JBQWY7QUFDWCxRQUFBOztNQURZLFVBQVU7O0lBQ3RCLEdBQUEsR0FBTSxPQUFBLENBQVEsU0FBUjtJQUVOLElBQUEsQ0FBQSxDQUE4QixPQUFBLFlBQW1CLEdBQUcsQ0FBQyxNQUFyRCxDQUFBO01BQUEsSUFBQyxDQUFBLGFBQUQsQ0FBZSxPQUFmLEVBQUE7O0lBQ0EsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFYLENBQWtCLE9BQWxCO0lBRUEsSUFBQyxDQUFBLEVBQUQsR0FBVSxJQUFBLEdBQUcsQ0FBQyxFQUFKLENBQUE7SUFFVixJQUFDLENBQUEsd0JBQUQsR0FBNEI7SUFDNUIsSUFBRyx3QkFBQSxJQUE2QixJQUFDLENBQUEsMkJBQUQsQ0FBNkIsd0JBQTdCLENBQWhDO01BQ0UsSUFBQyxDQUFBLHdCQUFELEdBQTRCLHlCQUQ5Qjs7RUFUVzs7cUJBY2IsY0FBQSxHQUFnQixTQUFDLE9BQUQsRUFBZSxFQUFmO0FBQ2QsUUFBQTs7TUFEZSxVQUFVOztJQUN6QixJQUFBLENBQThDLEVBQTlDO0FBQUEsWUFBVSxJQUFBLEtBQUEsQ0FBTSxzQkFBTixFQUFWOztJQUNFLDZCQUFGLEVBQWEsaUJBQWIsRUFBa0IsdUJBQWxCLEVBQTBCLHlCQUExQixFQUFtQyxpQkFBbkMsRUFBd0MscUNBQXhDLEVBQXVELDZCQUF2RCxFQUFrRSx1QkFBbEUsRUFBMEU7SUFDMUUsR0FBQSxHQUFNLE9BQU8sQ0FBQztJQUNkLE1BQUEsR0FBUyxPQUFPLENB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LElBQUEsS0FBQSxDQUFNLHlDQUFOLEVBRFo7O0VBekVhOzs7Ozs7QUE4RWpCLE1BQU0sQ0FBQyxPQUFQLEdBQWlCIiwic291cmNlc0NvbnRlbnQiOlsiIyBzMy1icm93c2VyLWRpcmVjdC11cGxvYWRcbl8gICAgICAgPSByZXF1aXJlKCdsb2Rhc2gnKVxubWltZSAgICA9IHJlcXVpcmUoJ21pbWUnKVxubW9tZW50ICA9IHJlcXVpcmUoJ21vbWVudCcpXG5jcnlwdG8gID0gcmVxdWlyZSgnY3J5cHRvJylcblxuXG5jbGFzcyBTM0NsaWVudFxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMgPSB7fSwgYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zKSAtPlxuICAgIGF3cyA9IHJlcXVpcmUoJ2F3cy1zZGsnKVxuXG4gICAgQF9jaGVja09wdGlvbnMgb3B0aW9ucyB1bmxlc3Mgb3B0aW9ucyBpbnN0YW5jZW9mIGF3cy5Db25maWdcbiAgICBhd3MuY29uZmlnLnVwZGF0ZSBvcHRpb25zXG5cbiAgICBAczMgPSBuZXcgYXdzLlMzKClcblxuICAgIEBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnMgPSBudWxsXG4gICAgaWYgYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zIGFuZCBAX2NoZWNrQWxsb3dlZERhdGFFeHRlbnNpb25zIGFyckFsbG93ZWREYXRhRXh0ZW5zaW9uc1xuICAgICAgQGFyckFsbG93ZWREYXRhRXh0ZW5zaW9ucyA9IGFyckFsbG93ZWREYXRhRXh0ZW5zaW9uc1xuXG5cbiAgIyBCcm93c2VyIGZvcm0gcG9zdCBwYXJhbXMgZm9yIHVwbG9hZGluZ1xuICB1cGxvYWRQb3N0Rm9ybTogKG9wdGlvbnMgPSB7fSwgY2IpIC0+XG4gICAgdGhyb3cgbmV3IEVycm9yICdDYWxsYmFjayBpcyByZXF1aXJlZCcgdW5sZXNzIGNiXG4gICAgeyBleHRlbnNpb24sIGtleSwgYnVja2V0LCBleHBpcmVzLCBhY2wsIGNvbnRlbnRMZW5ndGgsIGFsZ29yaXRobSwgcmVnaW9uLCBjb25kaXRpb25NYXRjaGluZyB9ID0gb3B0aW9uc1xuICAgIGtleSA9IG9wdGlvbnMua2V5XG4gICAgYnVja2V0ID0gb3B0aW9ucy5idWNrZXRcbiAgICBleHRlbnNpb24gPSBvcHRpb25zLmV4dGVuc2lvbiA/IG51bGxcbiAgICBleHBpcmVzID0gb3B0aW9ucy5leHBpcmVzID8gbW9tZW50LnV0YygpLmFkZCg2MCwgJ21pbnV0ZXMnKS50b0RhdGUoKVxuICAgIGFjbCA9IG9wdGlvbnMuYWNsID8gJ3B1YmxpYy1yZWFkJ1xuICAgIGNvbnRlbnRMZW5ndGggPSBvcHRpb25zLmNvbnRlbnRMZW5ndGggPyBudWxsXG4gICAgYWxnb3JpdGhtID0gb3B0aW9ucy5hbGdvcml0aG0gPyAnQVdTNC1ITUFDLVNIQTI1NidcbiAgICByZWdpb24gPSBvcHRpb25zLnJlZ2lvbiA/IEByZWdpb25cbiAgICBjb25kaXRpb25NYXRjaGluZyA9IG9wdGlvbnMuY29uZGl0aW9uTWF0Y2hpbmcgPyBudWxsXG5cbiAgICAjIEBUT0RPIG9wdGlvbnMgdHlwZSBjaGVja1xuICAgIHVubGVzcyBrZXkgYW5kIGJ1Y2tldFxuICAgICAgcmV0dXJuIGNiIG5ldyBFcnJvciAna2V5IGFuZCBidWNrZXQgYXJlIHJlcXVpcmVkJ1xuXG4gICAgaWYgZXh0ZW5zaW9uXG4gICAgICBjb250ZW50VHlwZSA9IEBfY2hlY2tEYXRhRXh0ZW5zaW9uIGV4dGVuc2lvblxuICAgICAgcmV0dXJuIGNiIG5ldyBFcnJvciAnRGF0YSBleHRlbnNpb24gbm90IGFsbG93ZWQnIHVubGVzcyBjb250ZW50VHlwZVxuXG4gICAgaWYgYWxnb3JpdGhtLnNwbGl0KCctJykubGVuZ3RoID09IDNcbiAgICAgIGFyckFsZ29yaXRobSA9IGFsZ29yaXRobS5zcGxpdCgnLScpXG4gICAgICBzaWd2ZXIgPSBhcnJBbGdvcml0aG1bMF1cbiAgICAgIGhhc2hhbGcgPSBhcnJBbGdvcml0aG1bMl0udG9Mb3dlckNhc2UoKVxuICAgIGVsc2VcbiAgICAgIHNpZ3ZlciA9IFwiQVdTNFwiXG4gICAgICBoYXNoYWxnID0gXCJzaGEyNTZcIlxuXG4gICAgcG9saWN5RG9jID0ge31cblxuICAgIHBvbGljeURvY1tcImV4cGlyYXRpb25cIl0gPSBtb21lbnQudXRjKGV4cGlyZXMpLmZvcm1hdChcIllZWVktTU0tRERbVF1ISDpNTTpTU1taXVwiKSBpZiBleHBpcmVzIGFuZCBfLmlzRGF0ZSBleHBpcmVzXG4gICAgcG9saWN5RG9jW1wiY29uZGl0aW9uc1wiXSA9IFtdXG5cbiAgICBkYXRlU2hvcnRQb2xpY3kgPSBtb21lbnQudXRjKCkuZm9ybWF0KCdZWVlZTU1ERCcpXG4gICAgZGF0ZUxvbmdQb2xpY3kgPSBtb21lbnQudXRjKCkuZm9ybWF0KCdZWVlZTU1ERFtUXUhITU1TU1taXScpXG5cbiAgICBwb2xpY3lEb2MuY29uZGl0aW9ucy5wdXNoIHsgJ2J1Y2tldCc6IGJ1Y2tldCB9XG4gICAgcG9saWN5RG9jLmNvbmRpdGlvbnMucHVzaCBbICdzdGFydHMtd2l0aCcsICcka2V5Jywga2V5IF1cbiAgICBwb2xpY3lEb2MuY29uZGl0aW9ucy5wdXNoIHsgJ2FjbCc6IGFjbCB9XG4gICAgcG9saWN5RG9jLmNvbmRpdGlvbnMucHVzaCBbICdzdGFydHMtd2l0aCcsICckQ29udGVudC1UeXBlJywgY29udGVudFR5cGUgXSBpZiBjb250ZW50VHlwZVxuICAgIHBvbGljeURvYy5jb25kaXRpb25zLnB1c2ggWyAnY29udGVudC1sZW5ndGgtcmFuZ2UnLCAwLCBjb250ZW50TGVuZ3RoIF0gaWYgY29udGVudExlbmd0aFxuICAgIHBvbGljeURvYy5jb25kaXRpb25zLnB1c2ggeyBcIngtYW16LWFsZ29yaXRobVwiOiBhbGdvcml0aG0gfVxuICAgIHBvbGljeURvYy5jb25kaXRpb25zLnB1c2ggeyBcIngtYW16LWNyZWRlbnRpYWxcIjogXCIje0BhY2Nlc3NLZXlJZH0vI3tkYXRlU2hvcnRQb2xpY3l9LyN7cmVnaW9ufS9zMy9hd3M0X3JlcXVlc3RcIiB9XG4gICAgcG9saWN5RG9jLmNvbmRpdGlvbnMucHVzaCB7IFwieC1hbXotZGF0ZVwiOiBkYXRlTG9uZ1BvbGljeX1cblxuICAgIGlmIGNvbmRpdGlvbk1hdGNoaW5nIGFuZCBfLmlzQXJyYXkgY29uZGl0aW9uTWF0Y2hpbmdcbiAgICAgIHBvbGljeURvYy5jb25kaXRpb25zID0gXy51bmlvbiBjb25kaXRpb25NYXRjaGluZywgcG9saWN5RG9jLmNvbmRpdGlvbnNcblxuICAgIGRhdGVLZXkgPSBjcnlwdG8uY3JlYXRlSG1hYyhoYXNoYWxnLCBcIiN7c2lndmVyfSN7QHNlY3JldEFjY2Vzc0tleX1cIikudXBkYXRlKGRhdGVTaG9ydFBvbGljeSkuZGlnZXN0KClcbiAgICBkYXRlUmVnaW9uS2V5ID0gY3J5cHRvLmNyZWF0ZUhtYWMoaGFzaGFsZywgZGF0ZUtleSkudXBkYXRlKHJlZ2lvbikuZGlnZXN0KClcbiAgICBkYXRlUmVnaW9uU2VydmljZUtleSA9IGNyeXB0by5jcmVhdGVIbWFjKGhhc2hhbGcsIGRhdGVSZWdpb25LZXkpLnVwZGF0ZSgnczMnKS5kaWdlc3QoKVxuICAgIHNpZ25pbmdLZXkgPSBjcnlwdG8uY3JlYXRlSG1hYyhoYXNoYWxnLCBkYXRlUmVnaW9uU2VydmljZUtleSkudXBkYXRlKFwiI3tzaWd2ZXIudG9Mb3dlckNhc2UoKX1fcmVxdWVzdFwiKS5kaWdlc3QoKVxuICAgIHBvbGljeSA9IG5ldyBCdWZmZXIoSlNPTi5zdHJpbmdpZnkocG9saWN5RG9jKSkudG9TdHJpbmcoJ2Jhc2U2NCcpXG4gICAgc2lnbmF0dXJlID0gY3J5cHRvLmNyZWF0ZUhtYWMoaGFzaGFsZyxzaWduaW5nS2V5KS51cGRhdGUocG9saWN5KS5kaWdlc3QoJ2hleCcpXG5cbiAgICBzdHJlYW0gPSB7fVxuICAgIHN0cmVhbVsncGFyYW1zJ10gPVxuICAgICAgXCJrZXlcIjoga2V5XG4gICAgICBcImFjbFwiOiBhY2xcbiAgICAgIFwieC1hbXotYWxnb3JpdGhtXCI6IGFsZ29yaXRobVxuICAgICAgXCJ4LWFtei1jcmVkZW50aWFsXCI6IFwiI3tAYWNjZXNzS2V5SWR9LyN7ZGF0ZVNob3J0UG9saWN5fS8je3JlZ2lvbn0vczMvI3tzaWd2ZXIudG9Mb3dlckNhc2UoKX1fcmVxdWVzdFwiXG4gICAgICBcIngtYW16LWRhdGVcIjogZGF0ZUxvbmdQb2xpY3lcbiAgICAgIFwicG9saWN5XCI6IHBvbGljeVxuICAgICAgXCJ4LWFtei1zaWduYXR1cmVcIjogc2lnbmF0dXJlXG4gICAgc3RyZWFtLnBhcmFtc1snY29udGVudC10eXBlJ10gPSBjb250ZW50VHlwZSBpZiBjb250ZW50VHlwZVxuICAgIHN0cmVhbVsnY29uZGl0aW9ucyddICA9IGNvbmRpdGlvbk1hdGNoaW5nIGlmIGNvbmRpdGlvbk1hdGNoaW5nXG4gICAgaWYgb3B0aW9ucy5zM0ZvcmNlUGF0aFN0eWxlXG4gICAgICBzdHJlYW1bJ3B1YmxpY191cmwnXSAgPSBcImh0dHBzOi8vczMuYW1hem9uYXdzLmNvbS8je2J1Y2tldH0vI3trZXl9XCJcbiAgICAgIHN0cmVhbVsnZm9ybV91cmwnXSAgICA9IFwiaHR0cHM6Ly9zMy5hbWF6b25hd3MuY29tLyN7YnVja2V0fS9cIlxuICAgIGVsc2VcbiAgICAgIHN0cmVhbVsncHVibGljX3VybCddICA9IFwiaHR0cHM6Ly8je2J1Y2tldH0uczMuYW1hem9uYXdzLmNvbS8je2tleX1cIlxuICAgICAgc3RyZWFtWydmb3JtX3VybCddICAgID0gXCJodHRwczovLyN7YnVja2V0fS5zMy5hbWF6b25hd3MuY29tL1wiXG4gICAgY2IgbnVsbCwgc3RyZWFtXG5cblxuICAjIFMzLnVwbG9hZFxuICB1cGxvYWQ6IChvcHRpb25zID0ge30sIGNiKSAtPlxuICAgIHRocm93IG5ldyBFcnJvciAnQ2FsbGJhY2sgaXMgcmVxdWlyZWQnIHVubGVzcyBjYlxuICAgIHsgZGF0YSwgZXh0ZW5zaW9uLCBrZXksIGJ1Y2tldCwgZXhwaXJlcywgYWNsLCBjb250ZW50TGVuZ3RoIH0gPSBvcHRpb25zXG4gICAgZGF0YSA9IG9wdGlvbnMuZGF0YVxuICAgIGtleSA9IG9wdGlvbnMua2V5XG4gICAgYnVja2V0ID0gb3B0aW9ucy5idWNrZXRcbiAgICBleHRlbnNpb24gPSBvcHRpb25zLmV4dGVuc2lvbiA/IG51bGxcbiAgICBleHBpcmVzID0gb3B0aW9ucy5leHBpcmVzID8gbnVsbFxuICAgIGFjbCA9IG9wdGlvbnMuYWNsID8gbnVsbFxuICAgIGNvbnRlbnRMZW5ndGggPSBvcHRpb25zLmNvbnRlbnRMZW5ndGggPyBudWxsXG4gICAgXG4gICAgIyBAVE9ETyBvcHRpb25zIHR5cGUgY2hlY2tcbiAgICB1bmxlc3MgZGF0YSBhbmQga2V5IGFuZCBidWNrZXRcbiAgICAgIHJldHVybiBjYiBuZXcgRXJyb3IgJ2RhdGEsIGtleSBhbmQgYnVja2V0IGFyZSByZXF1aXJlZCdcblxuICAgIHBhcmFtcyA9XG4gICAgICBCdWNrZXQ6IGJ1Y2tldFxuICAgICAgS2V5OiBrZXlcbiAgICAgIEJvZHk6IGRhdGFcblxuICAgIGlmIGV4dGVuc2lvblxuICAgICAgY29udGVudFR5cGUgPSBAX2NoZWNrRGF0YUV4dGVuc2lvbiBleHRlbnNpb25cbiAgICAgIHJldHVybiBjYiBuZXcgRXJyb3IgJ0RhdGEgZXh0ZW5zaW9uIG5vdCBhbGxvd2VkJyB1bmxlc3MgY29udGVudFR5cGVcbiAgICAgIHBhcmFtc1tcIkNvbnRlbnRUeXBlXCJdID0gY29udGVudFR5cGVcblxuICAgIHBhcmFtc1tcIkV4cGlyZXNcIl0gPSBtb21lbnQudXRjKGV4cGlyZXMpIGlmIGV4cGlyZXMgYW5kIF8uaXNEYXRlIGV4cGlyZXNcbiAgICBwYXJhbXNbXCJBQ0xcIl0gPSBhY2wgaWYgYWNsXG4gICAgcGFyYW1zW1wiQ29udGVudExlbmd0aFwiXSA9IGNvbnRlbnRMZW5ndGggaWYgY29udGVudExlbmd0aFxuXG4gICAgQHMzLnVwbG9hZCBwYXJhbXMsIChlcnIsIGRhdGEpIC0+XG4gICAgICByZXR1cm4gY2IgZXJyIGlmIGVyclxuICAgICAgY2IgbnVsbCwgXCJodHRwczovLyN7YnVja2V0fS5zMy5hbWF6b25hd3MuY29tLyN7a2V5fVwiXG5cblxuICAjIFMzLnB1dE9iamVjdFxuICBwdXQ6IChvcHRpb25zID0ge30sIGNiKSAtPlxuICAgIHRocm93IG5ldyBFcnJvciAnQ2FsbGJhY2sgaXMgcmVxdWlyZWQnIHVubGVzcyBjYlxuICAgIHsgZXh0ZW5zaW9uLCBrZXksIGJ1Y2tldCwgZXhwaXJlcywgYWNsLCBjb250ZW50TGVuZ3RoIH0gPSBvcHRpb25zXG4gICAga2V5ID0gb3B0aW9ucy5rZXlcbiAgICBidWNrZXQgPSBvcHRpb25zLmJ1Y2tldFxuICAgIGV4dGVuc2lvbiA9IG9wdGlvbnMuZXh0ZW5zaW9uID8gbnVsbFxuICAgIGV4cGlyZXMgPSBvcHRpb25zLmV4cGlyZXMgPyBudWxsXG4gICAgYWNsID0gb3B0aW9ucy5hY2wgPyBudWxsXG5cbiAgICAjIEBUT0RPIG9wdGlvbnMgdHlwZSBjaGVja1xuICAgIHVubGVzcyBrZXkgYW5kIGJ1Y2tldFxuICAgICAgcmV0dXJuIGNiIG5ldyBFcnJvciAna2V5IGFuZCBidWNrZXQgYXJlIHJlcXVpcmVkJ1xuXG4gICAgcGFyYW1zID1cbiAgICAgIEJ1Y2tldDogYnVja2V0XG4gICAgICBLZXk6IGtleVxuXG4gICAgaWYgZXh0ZW5zaW9uXG4gICAgICBjb250ZW50VHlwZSA9IEBfY2hlY2tEYXRhRXh0ZW5zaW9uIGV4dGVuc2lvblxuICAgICAgcmV0dXJuIGNiIG5ldyBFcnJvciAnRGF0YSBleHRlbnNpb24gbm90IGFsbG93ZWQnIHVubGVzcyBjb250ZW50VHlwZVxuICAgICAgcGFyYW1zW1wiQ29udGVudFR5cGVcIl0gPSBjb250ZW50VHlwZVxuXG4gICAgcGFyYW1zW1wiRXhwaXJlc1wiXSA9IG1vbWVudC51dGMoZXhwaXJlcykgaWYgZXhwaXJlcyBhbmQgXy5pc0RhdGUgZXhwaXJlc1xuICAgIHBhcmFtc1tcIkFDTFwiXSA9IGFjbCBpZiBhY2xcblxuICAgIEBzMy5nZXRTaWduZWRVcmwgXCJwdXRPYmplY3RcIiwgcGFyYW1zLCAoZXJyLCBkYXRhKSAtPlxuICAgICAgcmV0dXJuIGNiIGVyciBpZiBlcnJcblxuICAgICAgcHV0ID1cbiAgICAgICAgJ3NpZ25lZF91cmwnOiBkYXRhXG4gICAgICAgICdwdWJsaWNfdXJsJzogXCJodHRwczovLyN7YnVja2V0fS5zMy5hbWF6b25hd3MuY29tLyN7a2V5fVwiXG5cbiAgICAgIGNiIG51bGwsIHB1dFxuXG5cbiAgIyBDaGVjayBkYXRhIHR5cGUgZnJvbSBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnNcbiAgX2NoZWNrRGF0YUV4dGVuc2lvbjogKGRhdGFFeHRlbnNpb24pIC0+XG4gICAgcmV0dXJuIGZhbHNlIGlmIG5vdCBkYXRhRXh0ZW5zaW9uIG9yIChAYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zIGFuZCBkYXRhRXh0ZW5zaW9uIG5vdCBpbiBAYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zKVxuICAgIHJldHVybiBtaW1lLmxvb2t1cCBkYXRhRXh0ZW5zaW9uXG5cblxuICAjIENoZWNrIGFsbG93ZWQgZGF0YSB0eXBlc1xuICBfY2hlY2tBbGxvd2VkRGF0YUV4dGVuc2lvbnM6IChhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnMpIC0+XG4gICAgcmV0dXJuIGZhbHNlIHVubGVzcyBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnNcblxuICAgIHVubGVzcyBfLmlzQXJyYXkgYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgXCJBbGxvd2VkIGRhdGEgZXh0ZW5zaW9ucyBtdXN0IGJlIGFycmF5IG9mIHN0cmluZ3NcIlxuXG4gICAgZm9yIGV4dCBvZiBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnNcbiAgICAgIHVubGVzcyBfLmlzU3RyaW5nIGV4dFxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IgXCJFeHRlbnNpb25zIG11c3QgYmUgYSBzdHJpbmdzXCJcblxuICAgIHJldHVybiB0cnVlXG5cblxuICAjIENoZWNrIG9wdGlvbnMgcGFyYW1zXG4gIF9jaGVja09wdGlvbnM6IChvcHRpb25zID0ge30pIC0+XG4gICAge1xuICAgICAgQGFjY2Vzc0tleUlkLCBAc2VjcmV0QWNjZXNzS2V5LCBAcmVnaW9uLCBAc2lnbmF0dXJlVmVyc2lvbiwgQG1heFJldHJpZXMsIEBtYXhSZWRpcmVjdHMsIEBzeXN0ZW1DbG9ja09mZnNldCxcbiAgICAgIEBzc2xFbmFibGVkLCBAcGFyYW1WYWxpZGF0aW9uLCBAY29tcHV0ZUNoZWNrc3VtcywgQGNvbnZlcnRSZXNwb25zZVR5cGVzLCBAczNGb3JjZVBhdGhTdHlsZSwgQHMzQnVja2V0RW5kcG9pbnQsXG4gICAgICBAYXBpVmVyc2lvbiwgQGh0dHBPcHRpb25zLCBAYXBpVmVyc2lvbnMsIEBzZXNzaW9uVG9rZW4sIEBjcmVkZW50aWFscywgQGNyZWRlbnRpYWxQcm92aWRlciwgQGxvZ2dlclxuICAgIH0gPSBvcHRpb25zXG5cbiAgICB1bmxlc3MgQGFjY2Vzc0tleUlkXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgXCJhY2Nlc3NLZXlJZCBpcyByZXF1aXJlZFwiXG5cbiAgICB1bmxlc3MgQHNlY3JldEFjY2Vzc0tleVxuICAgICAgdGhyb3cgbmV3IEVycm9yIFwic2VjcmV0QWNjZXNzS2V5IGlzIHJlcXVpcmVkXCJcblxuICAgIHVubGVzcyBAcmVnaW9uXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgXCJyZWdpb24gaXMgcmVxdWlyZWRcIlxuXG4gICAgdW5sZXNzIF8uaXNTdHJpbmcgQGFjY2Vzc0tleUlkXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgXCJhY2Nlc3NLZXlJZCBtdXN0IGJlIGEgc3RyaW5nXCJcblxuICAgIHVubGVzcyBfLmlzU3RyaW5nIEBzZWNyZXRBY2Nlc3NLZXlcbiAgICAgIHRocm93IG5ldyBFcnJvciBcInNlY3JldEFjY2Vzc0tleSBtdXN0IGJlIGEgc3RyaW5nXCJcblxuICAgIHVubGVzcyBfLmlzU3RyaW5nIEByZWdpb25cbiAgICAgIHRocm93IG5ldyBFcnJvciBcInJlZ2lvbiBtdXN0IGJlIGEgc3RyaW5nXCJcblxuICAgIGlmIEBzaWduYXR1cmVWZXJzaW9uIGFuZCBub3QgXy5pc1N0cmluZyBAc2lnbmF0dXJlVmVyc2lvblxuICAgICAgdGhyb3cgbmV3IEVycm9yIFwic2lnbmF0dXJlVmVyc2lvbiBtdXN0IGJlIGEgc3RyaW5nXCJcblxuICAgIGlmIEBtYXhSZXRyaWVzIGFuZCBub3QgXy5pc0ludGVnZXIgQG1heFJldHJpZXNcbiAgICAgIHRocm93IG5ldyBFcnJvciAnbWF4UmV0cmllcyBtdXN0IGJlIGEgaW50ZWdlcidcblxuICAgIGlmIEBtYXhSZWRpcmVjdHMgYW5kIG5vdCBfLmlzSW50ZWdlciBAbWF4UmVkaXJlY3RzXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ21heFJlZGlyZWN0cyBtdXN0IGJlIGEgaW50ZWdlcidcblxuICAgIGlmIEBzeXN0ZW1DbG9ja09mZnNldCBhbmQgbm90IF8uaXNOdW1iZXIgQHN5c3RlbUNsb2NrT2Zmc2V0XG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ3N5c3RlbUNsb2NrT2Zmc2V0IG11c3QgYmUgYSBudW1iZXInXG5cbiAgICBpZiBAc3NsRW5hYmxlZCBhbmQgbm90IF8uaXNCb29sZWFuIEBzc2xFbmFibGVkXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ3NzbEVuYWJsZWQgbXVzdCBiZSBhIGJvb2xlYW4nXG5cbiAgICBpZiBAcGFyYW1WYWxpZGF0aW9uIGFuZCBub3QgXy5pc0Jvb2xlYW4gQHBhcmFtVmFsaWRhdGlvblxuICAgICAgdGhyb3cgbmV3IEVycm9yICdwYXJhbVZhbGlkYXRpb24gbXVzdCBiZSBhIGJvb2xlYW4nXG5cbiAgICBpZiBAY29tcHV0ZUNoZWNrc3VtcyBhbmQgbm90IF8uaXNCb29sZWFuIEBjb21wdXRlQ2hlY2tzdW1zXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ2NvbXB1dGVDaGVja3N1bXMgbXVzdCBiZSBhIGJvb2xlYW4nXG5cbiAgICBpZiBAY29udmVydFJlc3BvbnNlVHlwZXMgYW5kIG5vdCBfLmlzQm9vbGVhbiBAY29udmVydFJlc3BvbnNlVHlwZXNcbiAgICAgIHRocm93IG5ldyBFcnJvciAnY29udmVydFJlc3BvbnNlVHlwZXMgbXVzdCBiZSBhIGJvb2xlYW4nXG5cbiAgICBpZiBAczNGb3JjZVBhdGhTdHlsZSBhbmQgbm90IF8uaXNCb29sZWFuIEBzM0ZvcmNlUGF0aFN0eWxlXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ3MzRm9yY2VQYXRoU3R5bGUgbXVzdCBiZSBhIGJvb2xlYW4nXG5cbiAgICBpZiBAczNCdWNrZXRFbmRwb2ludCBhbmQgbm90IF8uaXNCb29sZWFuIEBzM0J1Y2tldEVuZHBvaW50XG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ3MzQnVja2V0RW5kcG9pbnQgbXVzdCBiZSBhIGJvb2xlYW4nXG5cbiAgICBpZiBAaHR0cE9wdGlvbnMgYW5kIG5vdCBfLmlzUGxhaW5PYmplY3QgQGh0dHBPcHRpb25zXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ2h0dHBPcHRpb25zIG11c3QgYmUgYSBkaWN0IHdpdGggcGFyYW1zOiBwcm94eSwgYWdlbnQsIHRpbWVvdXQsIHhockFzeW5jLCB4aHJXaXRoQ3JlZGVudGlhbHMnXG5cbiAgICBpZiBAYXBpVmVyc2lvbnMgYW5kIG5vdCBfLmlzUGxhaW5PYmplY3QgQGFwaVZlcnNpb25zXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ2FwaVZlcnNpb25zIG11c3QgYmUgYSBkaWN0IHdpdGggdmVyc2lvbnMnXG5cbiAgICBpZiBAYXBpVmVyc2lvbiBhbmQgbm90IChfLmlzU3RyaW5nIEBhcGlWZXJzaW9uIG9yIF8uaXNEYXRlIEBhcGlWZXJzaW9uKVxuICAgICAgdGhyb3cgbmV3IEVycm9yICdhcGlWZXJzaW9uIG11c3QgYmUgYSBzdHJpbmcgb3IgZGF0ZSdcblxuICAgIGlmIEBzZXNzaW9uVG9rZW4gYW5kIG5vdCBAc2Vzc2lvblRva2VuIGluc3RhbmNlb2YgYXdzLkNyZWRlbnRpYWxzXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ3Nlc3Npb25Ub2tlbiBtdXN0IGJlIGEgQVdTLkNyZWRlbnRpYWxzJ1xuXG4gICAgaWYgQGNyZWRlbnRpYWxzIGFuZCBub3QgQGNyZWRlbnRpYWxzIGluc3RhbmNlb2YgYXdzLkNyZWRlbnRpYWxzXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ2NyZWRlbnRpYWxzIG11c3QgYmUgYSBBV1MuQ3JlZGVudGlhbHMnXG5cbiAgICBpZiBAY3JlZGVudGlhbFByb3ZpZGVyIGFuZCBub3QgQGNyZWRlbnRpYWxQcm92aWRlciBpbnN0YW5jZW9mIGF3cy5DcmVkZW50aWFsc1Byb3ZpZGVyQ2hhaW5cbiAgICAgIHRocm93IG5ldyBFcnJvciAnY3JlZGVudGlhbFByb3ZpZGVyIG11c3QgYmUgYSBBV1MuQ3JlZGVudGlhbHNQcm92aWRlckNoYWluJ1xuXG4gICAgaWYgQGxvZ2dlciBhbmQgbm90IChAbG9nZ2VyLndyaXRlIGFuZCBAbG9nZ2VyLmxvZylcbiAgICAgIHRocm93IG5ldyBFcnJvciAnbG9nZ2VyIG11c3QgaGF2ZSAjd3JpdGUgb3IgI2xvZyBtZXRob2RzJ1xuXG5cbiMgRXhwb3J0c1xubW9kdWxlLmV4cG9ydHMgPSBTM0NsaWVudFxuXG4iXX0=
