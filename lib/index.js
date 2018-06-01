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
    var acl, algorithm, arrAlgorithm, bucket, cacheControl, conditionMatching, contentDisposition, contentLength, contentType, dateKey, dateLongPolicy, dateRegionKey, dateRegionServiceKey, dateShortPolicy, expires, extension, hashalg, key, policy, policyDoc, ref, ref1, ref2, ref3, ref4, ref5, ref6, ref7, ref8, region, s3ForcePathStyle, signature, signingKey, sigver, stream;
    if (options == null) {
      options = {};
    }
    if (!cb) {
      throw new Error('Callback is required');
    }
    extension = options.extension, key = options.key, bucket = options.bucket, expires = options.expires, acl = options.acl, contentLength = options.contentLength, algorithm = options.algorithm, region = options.region, s3ForcePathStyle = options.s3ForcePathStyle, conditionMatching = options.conditionMatching;
    key = options.key;
    bucket = options.bucket;
    region = options.region;
    extension = (ref = options.extension) != null ? ref : null;
    expires = (ref1 = options.expires) != null ? ref1 : moment.utc().add(60, 'minutes').toDate();
    acl = (ref2 = options.acl) != null ? ref2 : 'public-read';
    contentLength = (ref3 = options.contentLength) != null ? ref3 : null;
    algorithm = (ref4 = options.algorithm) != null ? ref4 : 'AWS4-HMAC-SHA256';
    region = (ref5 = options.region) != null ? ref5 : this.region;
    conditionMatching = (ref6 = options.conditionMatching) != null ? ref6 : null;
    cacheControl = (ref7 = options.cacheControl) != null ? ref7 : null;
    contentDisposition = (ref8 = options.contentDisposition) != null ? ref8 : null;
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
    if (cacheControl) {
      policyDoc.conditions.push({
        'cache-control': cacheControl
      });
    }
    if (contentType) {
      policyDoc.conditions.push(['starts-with', '$Content-Type', '']);
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
    if (cacheControl) {
      stream.params['cache-control'] = cacheControl;
    }
    if (conditionMatching) {
      stream['conditions'] = conditionMatching;
    }
    if (this.s3ForcePathStyle) {
      stream['public_url'] = "https://s3-" + region + ".amazonaws.com/" + bucket + "/" + key;
      stream['form_url'] = "https://s3-" + region + ".amazonaws.com/" + bucket + "/";
    } else {
      stream['public_url'] = "https://" + bucket + ".s3.amazonaws.com/" + key;
      stream['form_url'] = "https://" + bucket + ".s3.amazonaws.com/";
    }
    return cb(null, stream);
  };

  S3Client.prototype.upload = function(options, cb) {
    var acl, bucket, contentDisposition, contentLength, contentType, data, expires, extension, key, params, ref, ref1, ref2, ref3, ref4;
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
    contentDisposition = (ref4 = options.contentDisposition) != null ? ref4 : null;
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
    if (cacheControl) {
      params["Cache-Control"] = cacheControl;
    }
    if (contentDisposition) {
      params["Content-Disposition"] = contentDisposition;
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
    params["Cache-Control"] = "max-age=31536000, immutable";
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGliL2luZGV4LmpzIiwic291cmNlcyI6WyJsaWIvaW5kZXguY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLElBQUEsaUNBQUE7RUFBQTs7QUFBQSxDQUFBLEdBQVUsT0FBQSxDQUFRLFFBQVI7O0FBQ1YsSUFBQSxHQUFVLE9BQUEsQ0FBUSxNQUFSOztBQUNWLE1BQUEsR0FBVSxPQUFBLENBQVEsUUFBUjs7QUFDVixNQUFBLEdBQVUsT0FBQSxDQUFRLFFBQVI7O0FBR0o7RUFDUyxrQkFBQyxPQUFELEVBQWUsd0JBQWY7QUFDWCxRQUFBOztNQURZLFVBQVU7O0lBQ3RCLEdBQUEsR0FBTSxPQUFBLENBQVEsU0FBUjtJQUVOLElBQUEsQ0FBQSxDQUE4QixPQUFBLFlBQW1CLEdBQUcsQ0FBQyxNQUFyRCxDQUFBO01BQUEsSUFBQyxDQUFBLGFBQUQsQ0FBZSxPQUFmLEVBQUE7O0lBQ0EsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFYLENBQWtCLE9BQWxCO0lBRUEsSUFBQyxDQUFBLEVBQUQsR0FBTSxJQUFJLEdBQUcsQ0FBQyxFQUFSLENBQUE7SUFFTixJQUFDLENBQUEsd0JBQUQsR0FBNEI7SUFDNUIsSUFBRyx3QkFBQSxJQUE2QixJQUFDLENBQUEsMkJBQUQsQ0FBNkIsd0JBQTdCLENBQWhDO01BQ0UsSUFBQyxDQUFBLHdCQUFELEdBQTRCLHlCQUQ5Qjs7RUFUVzs7cUJBY2IsY0FBQSxHQUFnQixTQUFDLE9BQUQsRUFBZSxFQUFmO0FBQ2QsUUFBQTs7TUFEZSxVQUFVOztJQUN6QixJQUFBLENBQThDLEVBQTlDO0FBQUEsWUFBTSxJQUFJLEtBQUosQ0FBVSxzQkFBVixFQUFOOztJQUNFLDZCQUFGLEVBQWEsaUJBQWIsRUFBa0IsdUJBQWxCLEVBQTBCLHlCQUExQixFQUFtQyxpQkFBbkMsRUFBd0MscUNBQXhDLEVBQXVELDZCQUF2RCxFQUFrRSx1QkFBbEUsRUFBMEUsMkNBQTFFLEVBQTRGO0lBQzVGLEdBQUEsR0FBTSxPQUFPLENBQUM7SUFDZCxNQUFBLEdBQVMsT0FBTyxDQUFDO0lBQ2pCLE1BQUEsR0FBUyxPQUFPLENBQUM7SUFDakIsU0FBQSw2Q0FBZ0M7SUFDaEMsT0FBQSw2Q0FBNEIsTUFBTSxDQUFDLEdBQVAsQ0FBQSxDQUFZLENBQUMsR0FBYixDQUFpQixFQUFqQixFQUFxQixTQUFyQixDQUErQixDQUFDLE1BQWhDLENBQUE7SUFDNUIsR0FBQSx5Q0FBb0I7SUFDcEIsYUFBQSxtREFBd0M7SUFDeEMsU0FBQSwrQ0FBZ0M7SUFDaEMsTUFBQSw0Q0FBMEIsSUFBQyxDQUFBO0lBQzNCLGlCQUFBLHVEQUFnRDtJQUNoRCxZQUFBLGtEQUFzQztJQUN0QyxrQkFBQSx3REFBa0Q7SUFFbEQsSUFBQSxDQUFBLENBQU8sR0FBQSxJQUFRLE1BQWYsQ0FBQTtBQUNFLGFBQU8sRUFBQSxDQUFHLElBQUksS0FBSixDQUFVLDZCQUFWLENBQUgsRUFEVDs7SUFHQSxJQUFHLFNBQUg7TUFDRSxXQUFBLEdBQWMsSUFBQyxDQUFBLG1CQUFELENBQXFCLFNBQXJCO01BQ2QsSUFBQSxDQUF3RCxXQUF4RDtBQUFBLGVBQU8sRUFBQSxDQUFHLElBQUksS0FBSixDQUFVLDRCQUFWLENBQUgsRUFBUDtPQUZGOztJQUlBLElBQUcsU0FBUyxDQUFDLEtBQVYsQ0FBZ0IsR0FBaEIsQ0FBb0IsQ0FBQyxNQUFyQixLQUErQixDQUFsQztNQUNFLFlBQUEsR0FBZSxTQUFTLENBQUMsS0FBVixDQUFnQixHQUFoQjtNQUNmLE1BQUEsR0FBUyxZQUFhLENBQUEsQ0FBQTtNQUN0QixPQUFBLEdBQVUsWUFBYSxDQUFBLENBQUEsQ0FBRSxDQUFDLFdBQWhCLENBQUEsRUFIWjtLQUFBLE1BQUE7TUFLRSxNQUFBLEdBQVM7TUFDVCxPQUFBLEdBQVUsU0FOWjs7SUFRQSxTQUFBLEdBQVk7SUFFWixJQUFvRixPQUFBLElBQVksQ0FBQyxDQUFDLE1BQUYsQ0FBUyxPQUFULENBQWhHO01BQUEsU0FBVSxDQUFBLFlBQUEsQ0FBVixHQUEwQixNQUFNLENBQUMsR0FBUCxDQUFXLE9BQVgsQ0FBbUIsQ0FBQyxNQUFwQixDQUEyQiwwQkFBM0IsRUFBMUI7O0lBQ0EsU0FBVSxDQUFBLFlBQUEsQ0FBVixHQUEwQjtJQUUxQixlQUFBLEdBQWtCLE1BQU0sQ0FBQyxHQUFQLENBQUEsQ0FBWSxDQUFDLE1BQWIsQ0FBb0IsVUFBcEI7SUFDbEIsY0FBQSxHQUFpQixNQUFNLENBQUMsR0FBUCxDQUFBLENBQVksQ0FBQyxNQUFiLENBQW9CLHNCQUFwQjtJQUVqQixTQUFTLENBQUMsVUFBVSxDQUFDLElBQXJCLENBQTBCO01BQUUsUUFBQSxFQUFVLE1BQVo7S0FBMUI7SUFDQSxTQUFTLENBQUMsVUFBVSxDQUFDLElBQXJCLENBQTBCLENBQUUsYUFBRixFQUFpQixNQUFqQixFQUF5QixHQUF6QixDQUExQjtJQUNBLFNBQVMsQ0FBQyxVQUFVLENBQUMsSUFBckIsQ0FBMEI7TUFBRSxLQUFBLEVBQU8sR0FBVDtLQUExQjtJQUNBLElBQStELFlBQS9EO01BQUEsU0FBUyxDQUFDLFVBQVUsQ0FBQyxJQUFyQixDQUEwQjtRQUFFLGVBQUEsRUFBaUIsWUFBbkI7T0FBMUIsRUFBQTs7SUFFQSxJQUFvRSxXQUFwRTtNQUFBLFNBQVMsQ0FBQyxVQUFVLENBQUMsSUFBckIsQ0FBMEIsQ0FBRSxhQUFGLEVBQWlCLGVBQWpCLEVBQWtDLEVBQWxDLENBQTFCLEVBQUE7O0lBQ0EsSUFBMEUsYUFBMUU7TUFBQSxTQUFTLENBQUMsVUFBVSxDQUFDLElBQXJCLENBQTBCLENBQUUsc0JBQUYsRUFBMEIsQ0FBMUIsRUFBNkIsYUFBN0IsQ0FBMUIsRUFBQTs7SUFDQSxTQUFTLENBQUMsVUFBVSxDQUFDLElBQXJCLENBQTBCO01BQUUsaUJBQUEsRUFBbUIsU0FBckI7S0FBMUI7SUFDQSxTQUFTLENBQUMsVUFBVSxDQUFDLElBQXJCLENBQTBCO01BQUUsa0JBQUEsRUFBdUIsSUFBQyxDQUFBLFdBQUYsR0FBYyxHQUFkLEdBQWlCLGVBQWpCLEdBQWlDLEdBQWpDLEdBQW9DLE1BQXBDLEdBQTJDLGtCQUFuRTtLQUExQjtJQUNBLFNBQVMsQ0FBQyxVQUFVLENBQUMsSUFBckIsQ0FBMEI7TUFBRSxZQUFBLEVBQWMsY0FBaEI7S0FBMUI7SUFFQSxJQUFHLGlCQUFBLElBQXNCLENBQUMsQ0FBQyxPQUFGLENBQVUsaUJBQVYsQ0FBekI7TUFDRSxTQUFTLENBQUMsVUFBVixHQUF1QixDQUFDLENBQUMsS0FBRixDQUFRLGlCQUFSLEVBQTJCLFNBQVMsQ0FBQyxVQUFyQyxFQUR6Qjs7SUFHQSxPQUFBLEdBQVUsTUFBTSxDQUFDLFVBQVAsQ0FBa0IsT0FBbEIsRUFBMkIsRUFBQSxHQUFHLE1BQUgsR0FBWSxJQUFDLENBQUEsZUFBeEMsQ0FBMEQsQ0FBQyxNQUEzRCxDQUFrRSxlQUFsRSxDQUFrRixDQUFDLE1BQW5GLENBQUE7SUFDVixhQUFBLEdBQWdCLE1BQU0sQ0FBQyxVQUFQLENBQWtCLE9BQWxCLEVBQTJCLE9BQTNCLENBQW1DLENBQUMsTUFBcEMsQ0FBMkMsTUFBM0MsQ0FBa0QsQ0FBQyxNQUFuRCxDQUFBO0lBQ2hCLG9CQUFBLEdBQXVCLE1BQU0sQ0FBQyxVQUFQLENBQWtCLE9BQWxCLEVBQTJCLGFBQTNCLENBQXlDLENBQUMsTUFBMUMsQ0FBaUQsSUFBakQsQ0FBc0QsQ0FBQyxNQUF2RCxDQUFBO0lBQ3ZCLFVBQUEsR0FBYSxNQUFNLENBQUMsVUFBUCxDQUFrQixPQUFsQixFQUEyQixvQkFBM0IsQ0FBZ0QsQ0FBQyxNQUFqRCxDQUEwRCxDQUFDLE1BQU0sQ0FBQyxXQUFQLENBQUEsQ0FBRCxDQUFBLEdBQXNCLFVBQWhGLENBQTBGLENBQUMsTUFBM0YsQ0FBQTtJQUNiLE1BQUEsR0FBUyxJQUFJLE1BQUosQ0FBVyxJQUFJLENBQUMsU0FBTCxDQUFlLFNBQWYsQ0FBWCxDQUFxQyxDQUFDLFFBQXRDLENBQStDLFFBQS9DO0lBQ1QsU0FBQSxHQUFZLE1BQU0sQ0FBQyxVQUFQLENBQWtCLE9BQWxCLEVBQTBCLFVBQTFCLENBQXFDLENBQUMsTUFBdEMsQ0FBNkMsTUFBN0MsQ0FBb0QsQ0FBQyxNQUFyRCxDQUE0RCxLQUE1RDtJQUVaLE1BQUEsR0FBUztJQUNULE1BQU8sQ0FBQSxRQUFBLENBQVAsR0FDRTtNQUFBLEtBQUEsRUFBTyxHQUFQO01BQ0EsS0FBQSxFQUFPLEdBRFA7TUFFQSxpQkFBQSxFQUFtQixTQUZuQjtNQUdBLGtCQUFBLEVBQXVCLElBQUMsQ0FBQSxXQUFGLEdBQWMsR0FBZCxHQUFpQixlQUFqQixHQUFpQyxHQUFqQyxHQUFvQyxNQUFwQyxHQUEyQyxNQUEzQyxHQUFnRCxDQUFDLE1BQU0sQ0FBQyxXQUFQLENBQUEsQ0FBRCxDQUFoRCxHQUFzRSxVQUg1RjtNQUlBLFlBQUEsRUFBYyxjQUpkO01BS0EsUUFBQSxFQUFVLE1BTFY7TUFNQSxpQkFBQSxFQUFtQixTQU5uQjs7SUFPRixJQUErQyxXQUEvQztNQUFBLE1BQU0sQ0FBQyxNQUFPLENBQUEsY0FBQSxDQUFkLEdBQWdDLFlBQWhDOztJQUNBLElBQWlELFlBQWpEO01BQUEsTUFBTSxDQUFDLE1BQU8sQ0FBQSxlQUFBLENBQWQsR0FBaUMsYUFBakM7O0lBRUEsSUFBNkMsaUJBQTdDO01BQUEsTUFBTyxDQUFBLFlBQUEsQ0FBUCxHQUF3QixrQkFBeEI7O0lBQ0EsSUFBRyxJQUFJLENBQUMsZ0JBQVI7TUFDRSxNQUFPLENBQUEsWUFBQSxDQUFQLEdBQXdCLGFBQUEsR0FBYyxNQUFkLEdBQXFCLGlCQUFyQixHQUFzQyxNQUF0QyxHQUE2QyxHQUE3QyxHQUFnRDtNQUN4RSxNQUFPLENBQUEsVUFBQSxDQUFQLEdBQXdCLGFBQUEsR0FBYyxNQUFkLEdBQXFCLGlCQUFyQixHQUFzQyxNQUF0QyxHQUE2QyxJQUZ2RTtLQUFBLE1BQUE7TUFJRSxNQUFPLENBQUEsWUFBQSxDQUFQLEdBQXdCLFVBQUEsR0FBVyxNQUFYLEdBQWtCLG9CQUFsQixHQUFzQztNQUM5RCxNQUFPLENBQUEsVUFBQSxDQUFQLEdBQXdCLFVBQUEsR0FBVyxNQUFYLEdBQWtCLHFCQUw1Qzs7V0FNQSxFQUFBLENBQUcsSUFBSCxFQUFTLE1BQVQ7RUEvRWM7O3FCQW1GaEIsTUFBQSxHQUFRLFNBQUMsT0FBRCxFQUFlLEVBQWY7QUFDTixRQUFBOztNQURPLFVBQVU7O0lBQ2pCLElBQUEsQ0FBOEMsRUFBOUM7QUFBQSxZQUFNLElBQUksS0FBSixDQUFVLHNCQUFWLEVBQU47O0lBQ0UsbUJBQUYsRUFBUSw2QkFBUixFQUFtQixpQkFBbkIsRUFBd0IsdUJBQXhCLEVBQWdDLHlCQUFoQyxFQUF5QyxpQkFBekMsRUFBOEM7SUFDOUMsSUFBQSxHQUFPLE9BQU8sQ0FBQztJQUNmLEdBQUEsR0FBTSxPQUFPLENBQUM7SUFDZCxNQUFBLEdBQVMsT0FBTyxDQUFDO0lBQ2pCLFNBQUEsNkNBQWdDO0lBQ2hDLE9BQUEsNkNBQTRCO0lBQzVCLEdBQUEseUNBQW9CO0lBQ3BCLGFBQUEsbURBQXdDO0lBQ3hDLGtCQUFBLHdEQUFrRDtJQUdsRCxJQUFBLENBQUEsQ0FBTyxJQUFBLElBQVMsR0FBVCxJQUFpQixNQUF4QixDQUFBO0FBQ0UsYUFBTyxFQUFBLENBQUcsSUFBSSxLQUFKLENBQVUsbUNBQVYsQ0FBSCxFQURUOztJQUdBLE1BQUEsR0FDRTtNQUFBLE1BQUEsRUFBUSxNQUFSO01BQ0EsR0FBQSxFQUFLLEdBREw7TUFFQSxJQUFBLEVBQU0sSUFGTjs7SUFJRixJQUFHLFNBQUg7TUFDRSxXQUFBLEdBQWMsSUFBQyxDQUFBLG1CQUFELENBQXFCLFNBQXJCO01BQ2QsSUFBQSxDQUF3RCxXQUF4RDtBQUFBLGVBQU8sRUFBQSxDQUFHLElBQUksS0FBSixDQUFVLDRCQUFWLENBQUgsRUFBUDs7TUFDQSxNQUFPLENBQUEsYUFBQSxDQUFQLEdBQXdCLFlBSDFCOztJQUtBLElBQTBDLFlBQTFDO01BQUEsTUFBTyxDQUFBLGVBQUEsQ0FBUCxHQUEwQixhQUExQjs7SUFDQSxJQUFzRCxrQkFBdEQ7TUFBQSxNQUFPLENBQUEscUJBQUEsQ0FBUCxHQUFnQyxtQkFBaEM7O0lBQ0EsSUFBMkMsT0FBQSxJQUFZLENBQUMsQ0FBQyxNQUFGLENBQVMsT0FBVCxDQUF2RDtNQUFBLE1BQU8sQ0FBQSxTQUFBLENBQVAsR0FBb0IsTUFBTSxDQUFDLEdBQVAsQ0FBVyxPQUFYLEVBQXBCOztJQUNBLElBQXVCLEdBQXZCO01BQUEsTUFBTyxDQUFBLEtBQUEsQ0FBUCxHQUFnQixJQUFoQjs7SUFDQSxJQUEyQyxhQUEzQztNQUFBLE1BQU8sQ0FBQSxlQUFBLENBQVAsR0FBMEIsY0FBMUI7O1dBRUEsSUFBQyxDQUFBLEVBQUUsQ0FBQyxNQUFKLENBQVcsTUFBWCxFQUFtQixTQUFDLEdBQUQsRUFBTSxJQUFOO01BQ2pCLElBQWlCLEdBQWpCO0FBQUEsZUFBTyxFQUFBLENBQUcsR0FBSCxFQUFQOzthQUNBLEVBQUEsQ0FBRyxJQUFILEVBQVMsVUFBQSxHQUFXLE1BQVgsR0FBa0Isb0JBQWxCLEdBQXNDLEdBQS9DO0lBRmlCLENBQW5CO0VBaENNOztxQkFzQ1IsR0FBQSxHQUFLLFNBQUMsT0FBRCxFQUFlLEVBQWY7QUFDSCxRQUFBOztNQURJLFVBQVU7O0lBQ2QsSUFBQSxDQUE4QyxFQUE5QztBQUFBLFlBQU0sSUFBSSxLQUFKLENBQVUsc0JBQVYsRUFBTjs7SUFDRSw2QkFBRixFQUFhLGlCQUFiLEVBQWtCLHVCQUFsQixFQUEwQix5QkFBMUIsRUFBbUMsaUJBQW5DLEVBQXdDO0lBQ3hDLEdBQUEsR0FBTSxPQUFPLENBQUM7SUFDZCxNQUFBLEdBQVMsT0FBTyxDQUFDO0lBQ2pCLFNBQUEsNkNBQWdDO0lBQ2hDLE9BQUEsNkNBQTRCO0lBQzVCLEdBQUEseUNBQW9CO0lBR3BCLElBQUEsQ0FBQSxDQUFPLEdBQUEsSUFBUSxNQUFmLENBQUE7QUFDRSxhQUFPLEVBQUEsQ0FBRyxJQUFJLEtBQUosQ0FBVSw2QkFBVixDQUFILEVBRFQ7O0lBR0EsTUFBQSxHQUNFO01BQUEsTUFBQSxFQUFRLE1BQVI7TUFDQSxHQUFBLEVBQUssR0FETDs7SUFHRixJQUFHLFNBQUg7TUFDRSxXQUFBLEdBQWMsSUFBQyxDQUFBLG1CQUFELENBQXFCLFNBQXJCO01BQ2QsSUFBQSxDQUF3RCxXQUF4RDtBQUFBLGVBQU8sRUFBQSxDQUFHLElBQUksS0FBSixDQUFVLDRCQUFWLENBQUgsRUFBUDs7TUFDQSxNQUFPLENBQUEsYUFBQSxDQUFQLEdBQXdCLFlBSDFCOztJQUtBLE1BQU8sQ0FBQSxlQUFBLENBQVAsR0FBMEI7SUFDMUIsSUFBMkMsT0FBQSxJQUFZLENBQUMsQ0FBQyxNQUFGLENBQVMsT0FBVCxDQUF2RDtNQUFBLE1BQU8sQ0FBQSxTQUFBLENBQVAsR0FBb0IsTUFBTSxDQUFDLEdBQVAsQ0FBVyxPQUFYLEVBQXBCOztJQUNBLElBQXVCLEdBQXZCO01BQUEsTUFBTyxDQUFBLEtBQUEsQ0FBUCxHQUFnQixJQUFoQjs7V0FFQSxJQUFDLENBQUEsRUFBRSxDQUFDLFlBQUosQ0FBaUIsV0FBakIsRUFBOEIsTUFBOUIsRUFBc0MsU0FBQyxHQUFELEVBQU0sSUFBTjtBQUNwQyxVQUFBO01BQUEsSUFBaUIsR0FBakI7QUFBQSxlQUFPLEVBQUEsQ0FBRyxHQUFILEVBQVA7O01BRUEsR0FBQSxHQUNFO1FBQUEsWUFBQSxFQUFjLElBQWQ7UUFDQSxZQUFBLEVBQWMsVUFBQSxHQUFXLE1BQVgsR0FBa0Isb0JBQWxCLEdBQXNDLEdBRHBEOzthQUdGLEVBQUEsQ0FBRyxJQUFILEVBQVMsR0FBVDtJQVBvQyxDQUF0QztFQTFCRzs7cUJBcUNMLG1CQUFBLEdBQXFCLFNBQUMsYUFBRDtJQUNuQixJQUFnQixDQUFJLGFBQUosSUFBcUIsQ0FBQyxJQUFDLENBQUEsd0JBQUQsSUFBOEIsYUFBcUIsSUFBQyxDQUFBLHdCQUF0QixFQUFBLGFBQUEsS0FBL0IsQ0FBckM7QUFBQSxhQUFPLE1BQVA7O0FBQ0EsV0FBTyxJQUFJLENBQUMsTUFBTCxDQUFZLGFBQVo7RUFGWTs7cUJBTXJCLDJCQUFBLEdBQTZCLFNBQUMsd0JBQUQ7QUFDM0IsUUFBQTtJQUFBLElBQUEsQ0FBb0Isd0JBQXBCO0FBQUEsYUFBTyxNQUFQOztJQUVBLElBQUEsQ0FBTyxDQUFDLENBQUMsT0FBRixDQUFVLHdCQUFWLENBQVA7QUFDRSxZQUFNLElBQUksS0FBSixDQUFVLGtEQUFWLEVBRFI7O0FBR0EsU0FBQSwrQkFBQTtNQUNFLElBQUEsQ0FBTyxDQUFDLENBQUMsUUFBRixDQUFXLEdBQVgsQ0FBUDtBQUNFLGNBQU0sSUFBSSxLQUFKLENBQVUsOEJBQVYsRUFEUjs7QUFERjtBQUlBLFdBQU87RUFWb0I7O3FCQWM3QixhQUFBLEdBQWUsU0FBQyxPQUFEOztNQUFDLFVBQVU7O0lBRXRCLElBQUMsQ0FBQSxzQkFBQSxXQURILEVBQ2dCLElBQUMsQ0FBQSwwQkFBQSxlQURqQixFQUNrQyxJQUFDLENBQUEsaUJBQUEsTUFEbkMsRUFDMkMsSUFBQyxDQUFBLDJCQUFBLGdCQUQ1QyxFQUM4RCxJQUFDLENBQUEscUJBQUEsVUFEL0QsRUFDMkUsSUFBQyxDQUFBLHVCQUFBLFlBRDVFLEVBQzBGLElBQUMsQ0FBQSw0QkFBQSxpQkFEM0YsRUFFRSxJQUFDLENBQUEscUJBQUEsVUFGSCxFQUVlLElBQUMsQ0FBQSwwQkFBQSxlQUZoQixFQUVpQyxJQUFDLENBQUEsMkJBQUEsZ0JBRmxDLEVBRW9ELElBQUMsQ0FBQSwrQkFBQSxvQkFGckQsRUFFMkUsSUFBQyxDQUFBLDJCQUFBLGdCQUY1RSxFQUU4RixJQUFDLENBQUEsMkJBQUEsZ0JBRi9GLEVBR0UsSUFBQyxDQUFBLHFCQUFBLFVBSEgsRUFHZSxJQUFDLENBQUEsc0JBQUEsV0FIaEIsRUFHNkIsSUFBQyxDQUFBLHNCQUFBLFdBSDlCLEVBRzJDLElBQUMsQ0FBQSx1QkFBQSxZQUg1QyxFQUcwRCxJQUFDLENBQUEsc0JBQUEsV0FIM0QsRUFHd0UsSUFBQyxDQUFBLDZCQUFBLGtCQUh6RSxFQUc2RixJQUFDLENBQUEsaUJBQUE7SUFHOUYsSUFBQSxDQUFPLElBQUMsQ0FBQSxXQUFSO0FBQ0UsWUFBTSxJQUFJLEtBQUosQ0FBVSx5QkFBVixFQURSOztJQUdBLElBQUEsQ0FBTyxJQUFDLENBQUEsZUFBUjtBQUNFLFlBQU0sSUFBSSxLQUFKLENBQVUsNkJBQVYsRUFEUjs7SUFHQSxJQUFBLENBQU8sSUFBQyxDQUFBLE1BQVI7QUFDRSxZQUFNLElBQUksS0FBSixDQUFVLG9CQUFWLEVBRFI7O0lBR0EsSUFBQSxDQUFPLENBQUMsQ0FBQyxRQUFGLENBQVcsSUFBQyxDQUFBLFdBQVosQ0FBUDtBQUNFLFlBQU0sSUFBSSxLQUFKLENBQVUsOEJBQVYsRUFEUjs7SUFHQSxJQUFBLENBQU8sQ0FBQyxDQUFDLFFBQUYsQ0FBVyxJQUFDLENBQUEsZUFBWixDQUFQO0FBQ0UsWUFBTSxJQUFJLEtBQUosQ0FBVSxrQ0FBVixFQURSOztJQUdBLElBQUEsQ0FBTyxDQUFDLENBQUMsUUFBRixDQUFXLElBQUMsQ0FBQSxNQUFaLENBQVA7QUFDRSxZQUFNLElBQUksS0FBSixDQUFVLHlCQUFWLEVBRFI7O0lBR0EsSUFBRyxJQUFDLENBQUEsZ0JBQUQsSUFBc0IsQ0FBSSxDQUFDLENBQUMsUUFBRixDQUFXLElBQUMsQ0FBQSxnQkFBWixDQUE3QjtBQUNFLFlBQU0sSUFBSSxLQUFKLENBQVUsbUNBQVYsRUFEUjs7SUFHQSxJQUFHLElBQUMsQ0FBQSxVQUFELElBQWdCLENBQUksQ0FBQyxDQUFDLFNBQUYsQ0FBWSxJQUFDLENBQUEsVUFBYixDQUF2QjtBQUNFLFlBQU0sSUFBSSxLQUFKLENBQVUsOEJBQVYsRUFEUjs7SUFHQSxJQUFHLElBQUMsQ0FBQSxZQUFELElBQWtCLENBQUksQ0FBQyxDQUFDLFNBQUYsQ0FBWSxJQUFDLENBQUEsWUFBYixDQUF6QjtBQUNFLFlBQU0sSUFBSSxLQUFKLENBQVUsZ0NBQVYsRUFEUjs7SUFHQSxJQUFHLElBQUMsQ0FBQSxpQkFBRCxJQUF1QixDQUFJLENBQUMsQ0FBQyxRQUFGLENBQVcsSUFBQyxDQUFBLGlCQUFaLENBQTlCO0FBQ0UsWUFBTSxJQUFJLEtBQUosQ0FBVSxvQ0FBVixFQURSOztJQUdBLElBQUcsSUFBQyxDQUFBLFVBQUQsSUFBZ0IsQ0FBSSxDQUFDLENBQUMsU0FBRixDQUFZLElBQUMsQ0FBQSxVQUFiLENBQXZCO0FBQ0UsWUFBTSxJQUFJLEtBQUosQ0FBVSw4QkFBVixFQURSOztJQUdBLElBQUcsSUFBQyxDQUFBLGVBQUQsSUFBcUIsQ0FBSSxDQUFDLENBQUMsU0FBRixDQUFZLElBQUMsQ0FBQSxlQUFiLENBQTVCO0FBQ0UsWUFBTSxJQUFJLEtBQUosQ0FBVSxtQ0FBVixFQURSOztJQUdBLElBQUcsSUFBQyxDQUFBLGdCQUFELElBQXNCLENBQUksQ0FBQyxDQUFDLFNBQUYsQ0FBWSxJQUFDLENBQUEsZ0JBQWIsQ0FBN0I7QUFDRSxZQUFNLElBQUksS0FBSixDQUFVLG9DQUFWLEVBRFI7O0lBR0EsSUFBRyxJQUFDLENBQUEsb0JBQUQsSUFBMEIsQ0FBSSxDQUFDLENBQUMsU0FBRixDQUFZLElBQUMsQ0FBQSxvQkFBYixDQUFqQztBQUNFLFlBQU0sSUFBSSxLQUFKLENBQVUsd0NBQVYsRUFEUjs7SUFHQSxJQUFHLElBQUMsQ0FBQSxnQkFBRCxJQUFzQixDQUFJLENBQUMsQ0FBQyxTQUFGLENBQVksSUFBQyxDQUFBLGdCQUFiLENBQTdCO0FBQ0UsWUFBTSxJQUFJLEtBQUosQ0FBVSxvQ0FBVixFQURSOztJQUdBLElBQUcsSUFBQyxDQUFBLGdCQUFELElBQXNCLENBQUksQ0FBQyxDQUFDLFNBQUYsQ0FBWSxJQUFDLENBQUEsZ0JBQWIsQ0FBN0I7QUFDRSxZQUFNLElBQUksS0FBSixDQUFVLG9DQUFWLEVBRFI7O0lBR0EsSUFBRyxJQUFDLENBQUEsV0FBRCxJQUFpQixDQUFJLENBQUMsQ0FBQyxhQUFGLENBQWdCLElBQUMsQ0FBQSxXQUFqQixDQUF4QjtBQUNFLFlBQU0sSUFBSSxLQUFKLENBQVUsNkZBQVYsRUFEUjs7SUFHQSxJQUFHLElBQUMsQ0FBQSxXQUFELElBQWlCLENBQUksQ0FBQyxDQUFDLGFBQUYsQ0FBZ0IsSUFBQyxDQUFBLFdBQWpCLENBQXhCO0FBQ0UsWUFBTSxJQUFJLEtBQUosQ0FBVSwwQ0FBVixFQURSOztJQUdBLElBQUcsSUFBQyxDQUFBLFVBQUQsSUFBZ0IsQ0FBSSxDQUFDLENBQUMsQ0FBQyxRQUFGLENBQVcsSUFBQyxDQUFBLFVBQUQsSUFBZSxDQUFDLENBQUMsTUFBRixDQUFTLElBQUMsQ0FBQSxVQUFWLENBQTFCLENBQUQsQ0FBdkI7QUFDRSxZQUFNLElBQUksS0FBSixDQUFVLHFDQUFWLEVBRFI7O0lBR0EsSUFBRyxJQUFDLENBQUEsWUFBRCxJQUFrQixDQUFJLElBQUMsQ0FBQSxZQUFMLFlBQTZCLEdBQUcsQ0FBQyxXQUF0RDtBQUNFLFlBQU0sSUFBSSxLQUFKLENBQVUsd0NBQVYsRUFEUjs7SUFHQSxJQUFHLElBQUMsQ0FBQSxXQUFELElBQWlCLENBQUksSUFBQyxDQUFBLFdBQUwsWUFBNEIsR0FBRyxDQUFDLFdBQXBEO0FBQ0UsWUFBTSxJQUFJLEtBQUosQ0FBVSx1Q0FBVixFQURSOztJQUdBLElBQUcsSUFBQyxDQUFBLGtCQUFELElBQXdCLENBQUksSUFBQyxDQUFBLGtCQUFMLFlBQW1DLEdBQUcsQ0FBQyx3QkFBbEU7QUFDRSxZQUFNLElBQUksS0FBSixDQUFVLDJEQUFWLEVBRFI7O0lBR0EsSUFBRyxJQUFDLENBQUEsTUFBRCxJQUFZLENBQUksQ0FBQyxJQUFDLENBQUEsTUFBTSxDQUFDLEtBQVIsSUFBa0IsSUFBQyxDQUFBLE1BQU0sQ0FBQyxHQUEzQixDQUFuQjtBQUNFLFlBQU0sSUFBSSxLQUFKLENBQVUseUNBQVYsRUFEUjs7RUF6RWE7Ozs7OztBQThFakIsTUFBTSxDQUFDLE9BQVAsR0FBaUIiLCJzb3VyY2VzQ29udGVudCI6WyIjIHMzLWJyb3dzZXItZGlyZWN0LXVwbG9hZFxuXyAgICAgICA9IHJlcXVpcmUoJ2xvZGFzaCcpXG5taW1lICAgID0gcmVxdWlyZSgnbWltZScpXG5tb21lbnQgID0gcmVxdWlyZSgnbW9tZW50JylcbmNyeXB0byAgPSByZXF1aXJlKCdjcnlwdG8nKVxuXG5cbmNsYXNzIFMzQ2xpZW50XG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucyA9IHt9LCBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnMpIC0+XG4gICAgYXdzID0gcmVxdWlyZSgnYXdzLXNkaycpXG5cbiAgICBAX2NoZWNrT3B0aW9ucyBvcHRpb25zIHVubGVzcyBvcHRpb25zIGluc3RhbmNlb2YgYXdzLkNvbmZpZ1xuICAgIGF3cy5jb25maWcudXBkYXRlIG9wdGlvbnNcblxuICAgIEBzMyA9IG5ldyBhd3MuUzMoKVxuXG4gICAgQGFyckFsbG93ZWREYXRhRXh0ZW5zaW9ucyA9IG51bGxcbiAgICBpZiBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnMgYW5kIEBfY2hlY2tBbGxvd2VkRGF0YUV4dGVuc2lvbnMgYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zXG4gICAgICBAYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zID0gYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zXG5cblxuICAjIEJyb3dzZXIgZm9ybSBwb3N0IHBhcmFtcyBmb3IgdXBsb2FkaW5nXG4gIHVwbG9hZFBvc3RGb3JtOiAob3B0aW9ucyA9IHt9LCBjYikgLT5cbiAgICB0aHJvdyBuZXcgRXJyb3IgJ0NhbGxiYWNrIGlzIHJlcXVpcmVkJyB1bmxlc3MgY2JcbiAgICB7IGV4dGVuc2lvbiwga2V5LCBidWNrZXQsIGV4cGlyZXMsIGFjbCwgY29udGVudExlbmd0aCwgYWxnb3JpdGhtLCByZWdpb24sIHMzRm9yY2VQYXRoU3R5bGUsIGNvbmRpdGlvbk1hdGNoaW5nIH0gPSBvcHRpb25zXG4gICAga2V5ID0gb3B0aW9ucy5rZXlcbiAgICBidWNrZXQgPSBvcHRpb25zLmJ1Y2tldFxuICAgIHJlZ2lvbiA9IG9wdGlvbnMucmVnaW9uXG4gICAgZXh0ZW5zaW9uID0gb3B0aW9ucy5leHRlbnNpb24gPyBudWxsXG4gICAgZXhwaXJlcyA9IG9wdGlvbnMuZXhwaXJlcyA/IG1vbWVudC51dGMoKS5hZGQoNjAsICdtaW51dGVzJykudG9EYXRlKClcbiAgICBhY2wgPSBvcHRpb25zLmFjbCA/ICdwdWJsaWMtcmVhZCdcbiAgICBjb250ZW50TGVuZ3RoID0gb3B0aW9ucy5jb250ZW50TGVuZ3RoID8gbnVsbFxuICAgIGFsZ29yaXRobSA9IG9wdGlvbnMuYWxnb3JpdGhtID8gJ0FXUzQtSE1BQy1TSEEyNTYnXG4gICAgcmVnaW9uID0gb3B0aW9ucy5yZWdpb24gPyBAcmVnaW9uXG4gICAgY29uZGl0aW9uTWF0Y2hpbmcgPSBvcHRpb25zLmNvbmRpdGlvbk1hdGNoaW5nID8gbnVsbFxuICAgIGNhY2hlQ29udHJvbCA9IG9wdGlvbnMuY2FjaGVDb250cm9sID8gbnVsbFxuICAgIGNvbnRlbnREaXNwb3NpdGlvbiA9IG9wdGlvbnMuY29udGVudERpc3Bvc2l0aW9uID8gbnVsbFxuICAgICMgQFRPRE8gb3B0aW9ucyB0eXBlIGNoZWNrXG4gICAgdW5sZXNzIGtleSBhbmQgYnVja2V0XG4gICAgICByZXR1cm4gY2IgbmV3IEVycm9yICdrZXkgYW5kIGJ1Y2tldCBhcmUgcmVxdWlyZWQnXG5cbiAgICBpZiBleHRlbnNpb25cbiAgICAgIGNvbnRlbnRUeXBlID0gQF9jaGVja0RhdGFFeHRlbnNpb24gZXh0ZW5zaW9uXG4gICAgICByZXR1cm4gY2IgbmV3IEVycm9yICdEYXRhIGV4dGVuc2lvbiBub3QgYWxsb3dlZCcgdW5sZXNzIGNvbnRlbnRUeXBlXG5cbiAgICBpZiBhbGdvcml0aG0uc3BsaXQoJy0nKS5sZW5ndGggPT0gM1xuICAgICAgYXJyQWxnb3JpdGhtID0gYWxnb3JpdGhtLnNwbGl0KCctJylcbiAgICAgIHNpZ3ZlciA9IGFyckFsZ29yaXRobVswXVxuICAgICAgaGFzaGFsZyA9IGFyckFsZ29yaXRobVsyXS50b0xvd2VyQ2FzZSgpXG4gICAgZWxzZVxuICAgICAgc2lndmVyID0gXCJBV1M0XCJcbiAgICAgIGhhc2hhbGcgPSBcInNoYTI1NlwiXG5cbiAgICBwb2xpY3lEb2MgPSB7fVxuXG4gICAgcG9saWN5RG9jW1wiZXhwaXJhdGlvblwiXSA9IG1vbWVudC51dGMoZXhwaXJlcykuZm9ybWF0KFwiWVlZWS1NTS1ERFtUXUhIOk1NOlNTW1pdXCIpIGlmIGV4cGlyZXMgYW5kIF8uaXNEYXRlIGV4cGlyZXNcbiAgICBwb2xpY3lEb2NbXCJjb25kaXRpb25zXCJdID0gW11cblxuICAgIGRhdGVTaG9ydFBvbGljeSA9IG1vbWVudC51dGMoKS5mb3JtYXQoJ1lZWVlNTUREJylcbiAgICBkYXRlTG9uZ1BvbGljeSA9IG1vbWVudC51dGMoKS5mb3JtYXQoJ1lZWVlNTUREW1RdSEhNTVNTW1pdJylcblxuICAgIHBvbGljeURvYy5jb25kaXRpb25zLnB1c2ggeyAnYnVja2V0JzogYnVja2V0IH1cbiAgICBwb2xpY3lEb2MuY29uZGl0aW9ucy5wdXNoIFsgJ3N0YXJ0cy13aXRoJywgJyRrZXknLCBrZXkgXVxuICAgIHBvbGljeURvYy5jb25kaXRpb25zLnB1c2ggeyAnYWNsJzogYWNsIH1cbiAgICBwb2xpY3lEb2MuY29uZGl0aW9ucy5wdXNoIHsgJ2NhY2hlLWNvbnRyb2wnOiBjYWNoZUNvbnRyb2wgfSBpZiBjYWNoZUNvbnRyb2xcbiAgICAjIHBvbGljeURvYy5jb25kaXRpb25zLnB1c2ggeyAnY29udGVudC1kaXNwb3NpdGlvbic6IGNvbnRlbnREaXNwb3NpdGlvbiB9IGlmIGNvbnRlbnREaXNwb3NpdGlvblxuICAgIHBvbGljeURvYy5jb25kaXRpb25zLnB1c2ggWyAnc3RhcnRzLXdpdGgnLCAnJENvbnRlbnQtVHlwZScsICcnIF0gaWYgY29udGVudFR5cGVcbiAgICBwb2xpY3lEb2MuY29uZGl0aW9ucy5wdXNoIFsgJ2NvbnRlbnQtbGVuZ3RoLXJhbmdlJywgMCwgY29udGVudExlbmd0aCBdIGlmIGNvbnRlbnRMZW5ndGhcbiAgICBwb2xpY3lEb2MuY29uZGl0aW9ucy5wdXNoIHsgXCJ4LWFtei1hbGdvcml0aG1cIjogYWxnb3JpdGhtIH1cbiAgICBwb2xpY3lEb2MuY29uZGl0aW9ucy5wdXNoIHsgXCJ4LWFtei1jcmVkZW50aWFsXCI6IFwiI3tAYWNjZXNzS2V5SWR9LyN7ZGF0ZVNob3J0UG9saWN5fS8je3JlZ2lvbn0vczMvYXdzNF9yZXF1ZXN0XCIgfVxuICAgIHBvbGljeURvYy5jb25kaXRpb25zLnB1c2ggeyBcIngtYW16LWRhdGVcIjogZGF0ZUxvbmdQb2xpY3l9XG5cbiAgICBpZiBjb25kaXRpb25NYXRjaGluZyBhbmQgXy5pc0FycmF5IGNvbmRpdGlvbk1hdGNoaW5nXG4gICAgICBwb2xpY3lEb2MuY29uZGl0aW9ucyA9IF8udW5pb24gY29uZGl0aW9uTWF0Y2hpbmcsIHBvbGljeURvYy5jb25kaXRpb25zXG5cbiAgICBkYXRlS2V5ID0gY3J5cHRvLmNyZWF0ZUhtYWMoaGFzaGFsZywgXCIje3NpZ3Zlcn0je0BzZWNyZXRBY2Nlc3NLZXl9XCIpLnVwZGF0ZShkYXRlU2hvcnRQb2xpY3kpLmRpZ2VzdCgpXG4gICAgZGF0ZVJlZ2lvbktleSA9IGNyeXB0by5jcmVhdGVIbWFjKGhhc2hhbGcsIGRhdGVLZXkpLnVwZGF0ZShyZWdpb24pLmRpZ2VzdCgpXG4gICAgZGF0ZVJlZ2lvblNlcnZpY2VLZXkgPSBjcnlwdG8uY3JlYXRlSG1hYyhoYXNoYWxnLCBkYXRlUmVnaW9uS2V5KS51cGRhdGUoJ3MzJykuZGlnZXN0KClcbiAgICBzaWduaW5nS2V5ID0gY3J5cHRvLmNyZWF0ZUhtYWMoaGFzaGFsZywgZGF0ZVJlZ2lvblNlcnZpY2VLZXkpLnVwZGF0ZShcIiN7c2lndmVyLnRvTG93ZXJDYXNlKCl9X3JlcXVlc3RcIikuZGlnZXN0KClcbiAgICBwb2xpY3kgPSBuZXcgQnVmZmVyKEpTT04uc3RyaW5naWZ5KHBvbGljeURvYykpLnRvU3RyaW5nKCdiYXNlNjQnKVxuICAgIHNpZ25hdHVyZSA9IGNyeXB0by5jcmVhdGVIbWFjKGhhc2hhbGcsc2lnbmluZ0tleSkudXBkYXRlKHBvbGljeSkuZGlnZXN0KCdoZXgnKVxuXG4gICAgc3RyZWFtID0ge31cbiAgICBzdHJlYW1bJ3BhcmFtcyddID1cbiAgICAgIFwia2V5XCI6IGtleVxuICAgICAgXCJhY2xcIjogYWNsXG4gICAgICBcIngtYW16LWFsZ29yaXRobVwiOiBhbGdvcml0aG1cbiAgICAgIFwieC1hbXotY3JlZGVudGlhbFwiOiBcIiN7QGFjY2Vzc0tleUlkfS8je2RhdGVTaG9ydFBvbGljeX0vI3tyZWdpb259L3MzLyN7c2lndmVyLnRvTG93ZXJDYXNlKCl9X3JlcXVlc3RcIlxuICAgICAgXCJ4LWFtei1kYXRlXCI6IGRhdGVMb25nUG9saWN5XG4gICAgICBcInBvbGljeVwiOiBwb2xpY3lcbiAgICAgIFwieC1hbXotc2lnbmF0dXJlXCI6IHNpZ25hdHVyZVxuICAgIHN0cmVhbS5wYXJhbXNbJ2NvbnRlbnQtdHlwZSddID0gY29udGVudFR5cGUgaWYgY29udGVudFR5cGVcbiAgICBzdHJlYW0ucGFyYW1zWydjYWNoZS1jb250cm9sJ10gPSBjYWNoZUNvbnRyb2wgaWYgY2FjaGVDb250cm9sXG4gICAgIyBzdHJlYW0ucGFyYW1zWydjb250ZW50LWRpc3Bvc2l0aW9uJ10gPSBjb250ZW50RGlzcG9zaXRpb24gaWYgY29udGVudERpc3Bvc2l0aW9uXG4gICAgc3RyZWFtWydjb25kaXRpb25zJ10gID0gY29uZGl0aW9uTWF0Y2hpbmcgaWYgY29uZGl0aW9uTWF0Y2hpbmdcbiAgICBpZiB0aGlzLnMzRm9yY2VQYXRoU3R5bGVcbiAgICAgIHN0cmVhbVsncHVibGljX3VybCddICA9IFwiaHR0cHM6Ly9zMy0je3JlZ2lvbn0uYW1hem9uYXdzLmNvbS8je2J1Y2tldH0vI3trZXl9XCJcbiAgICAgIHN0cmVhbVsnZm9ybV91cmwnXSAgICA9IFwiaHR0cHM6Ly9zMy0je3JlZ2lvbn0uYW1hem9uYXdzLmNvbS8je2J1Y2tldH0vXCJcbiAgICBlbHNlXG4gICAgICBzdHJlYW1bJ3B1YmxpY191cmwnXSAgPSBcImh0dHBzOi8vI3tidWNrZXR9LnMzLmFtYXpvbmF3cy5jb20vI3trZXl9XCJcbiAgICAgIHN0cmVhbVsnZm9ybV91cmwnXSAgICA9IFwiaHR0cHM6Ly8je2J1Y2tldH0uczMuYW1hem9uYXdzLmNvbS9cIlxuICAgIGNiIG51bGwsIHN0cmVhbVxuXG5cbiAgIyBTMy51cGxvYWRcbiAgdXBsb2FkOiAob3B0aW9ucyA9IHt9LCBjYikgLT5cbiAgICB0aHJvdyBuZXcgRXJyb3IgJ0NhbGxiYWNrIGlzIHJlcXVpcmVkJyB1bmxlc3MgY2JcbiAgICB7IGRhdGEsIGV4dGVuc2lvbiwga2V5LCBidWNrZXQsIGV4cGlyZXMsIGFjbCwgY29udGVudExlbmd0aCB9ID0gb3B0aW9uc1xuICAgIGRhdGEgPSBvcHRpb25zLmRhdGFcbiAgICBrZXkgPSBvcHRpb25zLmtleVxuICAgIGJ1Y2tldCA9IG9wdGlvbnMuYnVja2V0XG4gICAgZXh0ZW5zaW9uID0gb3B0aW9ucy5leHRlbnNpb24gPyBudWxsXG4gICAgZXhwaXJlcyA9IG9wdGlvbnMuZXhwaXJlcyA/IG51bGxcbiAgICBhY2wgPSBvcHRpb25zLmFjbCA/IG51bGxcbiAgICBjb250ZW50TGVuZ3RoID0gb3B0aW9ucy5jb250ZW50TGVuZ3RoID8gbnVsbFxuICAgIGNvbnRlbnREaXNwb3NpdGlvbiA9IG9wdGlvbnMuY29udGVudERpc3Bvc2l0aW9uID8gbnVsbFxuICAgIFxuICAgICMgQFRPRE8gb3B0aW9ucyB0eXBlIGNoZWNrXG4gICAgdW5sZXNzIGRhdGEgYW5kIGtleSBhbmQgYnVja2V0XG4gICAgICByZXR1cm4gY2IgbmV3IEVycm9yICdkYXRhLCBrZXkgYW5kIGJ1Y2tldCBhcmUgcmVxdWlyZWQnXG5cbiAgICBwYXJhbXMgPVxuICAgICAgQnVja2V0OiBidWNrZXRcbiAgICAgIEtleToga2V5XG4gICAgICBCb2R5OiBkYXRhXG5cbiAgICBpZiBleHRlbnNpb25cbiAgICAgIGNvbnRlbnRUeXBlID0gQF9jaGVja0RhdGFFeHRlbnNpb24gZXh0ZW5zaW9uXG4gICAgICByZXR1cm4gY2IgbmV3IEVycm9yICdEYXRhIGV4dGVuc2lvbiBub3QgYWxsb3dlZCcgdW5sZXNzIGNvbnRlbnRUeXBlXG4gICAgICBwYXJhbXNbXCJDb250ZW50VHlwZVwiXSA9IGNvbnRlbnRUeXBlXG5cbiAgICBwYXJhbXNbXCJDYWNoZS1Db250cm9sXCJdID0gY2FjaGVDb250cm9sIGlmIGNhY2hlQ29udHJvbFxuICAgIHBhcmFtc1tcIkNvbnRlbnQtRGlzcG9zaXRpb25cIl0gPSBjb250ZW50RGlzcG9zaXRpb24gaWYgY29udGVudERpc3Bvc2l0aW9uXG4gICAgcGFyYW1zW1wiRXhwaXJlc1wiXSA9IG1vbWVudC51dGMoZXhwaXJlcykgaWYgZXhwaXJlcyBhbmQgXy5pc0RhdGUgZXhwaXJlc1xuICAgIHBhcmFtc1tcIkFDTFwiXSA9IGFjbCBpZiBhY2xcbiAgICBwYXJhbXNbXCJDb250ZW50TGVuZ3RoXCJdID0gY29udGVudExlbmd0aCBpZiBjb250ZW50TGVuZ3RoXG5cbiAgICBAczMudXBsb2FkIHBhcmFtcywgKGVyciwgZGF0YSkgLT5cbiAgICAgIHJldHVybiBjYiBlcnIgaWYgZXJyXG4gICAgICBjYiBudWxsLCBcImh0dHBzOi8vI3tidWNrZXR9LnMzLmFtYXpvbmF3cy5jb20vI3trZXl9XCJcblxuXG4gICMgUzMucHV0T2JqZWN0XG4gIHB1dDogKG9wdGlvbnMgPSB7fSwgY2IpIC0+XG4gICAgdGhyb3cgbmV3IEVycm9yICdDYWxsYmFjayBpcyByZXF1aXJlZCcgdW5sZXNzIGNiXG4gICAgeyBleHRlbnNpb24sIGtleSwgYnVja2V0LCBleHBpcmVzLCBhY2wsIGNvbnRlbnRMZW5ndGggfSA9IG9wdGlvbnNcbiAgICBrZXkgPSBvcHRpb25zLmtleVxuICAgIGJ1Y2tldCA9IG9wdGlvbnMuYnVja2V0XG4gICAgZXh0ZW5zaW9uID0gb3B0aW9ucy5leHRlbnNpb24gPyBudWxsXG4gICAgZXhwaXJlcyA9IG9wdGlvbnMuZXhwaXJlcyA/IG51bGxcbiAgICBhY2wgPSBvcHRpb25zLmFjbCA/IG51bGxcblxuICAgICMgQFRPRE8gb3B0aW9ucyB0eXBlIGNoZWNrXG4gICAgdW5sZXNzIGtleSBhbmQgYnVja2V0XG4gICAgICByZXR1cm4gY2IgbmV3IEVycm9yICdrZXkgYW5kIGJ1Y2tldCBhcmUgcmVxdWlyZWQnXG5cbiAgICBwYXJhbXMgPVxuICAgICAgQnVja2V0OiBidWNrZXRcbiAgICAgIEtleToga2V5XG5cbiAgICBpZiBleHRlbnNpb25cbiAgICAgIGNvbnRlbnRUeXBlID0gQF9jaGVja0RhdGFFeHRlbnNpb24gZXh0ZW5zaW9uXG4gICAgICByZXR1cm4gY2IgbmV3IEVycm9yICdEYXRhIGV4dGVuc2lvbiBub3QgYWxsb3dlZCcgdW5sZXNzIGNvbnRlbnRUeXBlXG4gICAgICBwYXJhbXNbXCJDb250ZW50VHlwZVwiXSA9IGNvbnRlbnRUeXBlXG5cbiAgICBwYXJhbXNbXCJDYWNoZS1Db250cm9sXCJdID0gXCJtYXgtYWdlPTMxNTM2MDAwLCBpbW11dGFibGVcIlxuICAgIHBhcmFtc1tcIkV4cGlyZXNcIl0gPSBtb21lbnQudXRjKGV4cGlyZXMpIGlmIGV4cGlyZXMgYW5kIF8uaXNEYXRlIGV4cGlyZXNcbiAgICBwYXJhbXNbXCJBQ0xcIl0gPSBhY2wgaWYgYWNsXG5cbiAgICBAczMuZ2V0U2lnbmVkVXJsIFwicHV0T2JqZWN0XCIsIHBhcmFtcywgKGVyciwgZGF0YSkgLT5cbiAgICAgIHJldHVybiBjYiBlcnIgaWYgZXJyXG5cbiAgICAgIHB1dCA9XG4gICAgICAgICdzaWduZWRfdXJsJzogZGF0YVxuICAgICAgICAncHVibGljX3VybCc6IFwiaHR0cHM6Ly8je2J1Y2tldH0uczMuYW1hem9uYXdzLmNvbS8je2tleX1cIlxuXG4gICAgICBjYiBudWxsLCBwdXRcblxuXG4gICMgQ2hlY2sgZGF0YSB0eXBlIGZyb20gYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zXG4gIF9jaGVja0RhdGFFeHRlbnNpb246IChkYXRhRXh0ZW5zaW9uKSAtPlxuICAgIHJldHVybiBmYWxzZSBpZiBub3QgZGF0YUV4dGVuc2lvbiBvciAoQGFyckFsbG93ZWREYXRhRXh0ZW5zaW9ucyBhbmQgZGF0YUV4dGVuc2lvbiBub3QgaW4gQGFyckFsbG93ZWREYXRhRXh0ZW5zaW9ucylcbiAgICByZXR1cm4gbWltZS5sb29rdXAgZGF0YUV4dGVuc2lvblxuXG5cbiAgIyBDaGVjayBhbGxvd2VkIGRhdGEgdHlwZXNcbiAgX2NoZWNrQWxsb3dlZERhdGFFeHRlbnNpb25zOiAoYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zKSAtPlxuICAgIHJldHVybiBmYWxzZSB1bmxlc3MgYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zXG5cbiAgICB1bmxlc3MgXy5pc0FycmF5IGFyckFsbG93ZWREYXRhRXh0ZW5zaW9uc1xuICAgICAgdGhyb3cgbmV3IEVycm9yIFwiQWxsb3dlZCBkYXRhIGV4dGVuc2lvbnMgbXVzdCBiZSBhcnJheSBvZiBzdHJpbmdzXCJcblxuICAgIGZvciBleHQgb2YgYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zXG4gICAgICB1bmxlc3MgXy5pc1N0cmluZyBleHRcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yIFwiRXh0ZW5zaW9ucyBtdXN0IGJlIGEgc3RyaW5nc1wiXG5cbiAgICByZXR1cm4gdHJ1ZVxuXG5cbiAgIyBDaGVjayBvcHRpb25zIHBhcmFtc1xuICBfY2hlY2tPcHRpb25zOiAob3B0aW9ucyA9IHt9KSAtPlxuICAgIHtcbiAgICAgIEBhY2Nlc3NLZXlJZCwgQHNlY3JldEFjY2Vzc0tleSwgQHJlZ2lvbiwgQHNpZ25hdHVyZVZlcnNpb24sIEBtYXhSZXRyaWVzLCBAbWF4UmVkaXJlY3RzLCBAc3lzdGVtQ2xvY2tPZmZzZXQsXG4gICAgICBAc3NsRW5hYmxlZCwgQHBhcmFtVmFsaWRhdGlvbiwgQGNvbXB1dGVDaGVja3N1bXMsIEBjb252ZXJ0UmVzcG9uc2VUeXBlcywgQHMzRm9yY2VQYXRoU3R5bGUsIEBzM0J1Y2tldEVuZHBvaW50LFxuICAgICAgQGFwaVZlcnNpb24sIEBodHRwT3B0aW9ucywgQGFwaVZlcnNpb25zLCBAc2Vzc2lvblRva2VuLCBAY3JlZGVudGlhbHMsIEBjcmVkZW50aWFsUHJvdmlkZXIsIEBsb2dnZXJcbiAgICB9ID0gb3B0aW9uc1xuXG4gICAgdW5sZXNzIEBhY2Nlc3NLZXlJZFxuICAgICAgdGhyb3cgbmV3IEVycm9yIFwiYWNjZXNzS2V5SWQgaXMgcmVxdWlyZWRcIlxuXG4gICAgdW5sZXNzIEBzZWNyZXRBY2Nlc3NLZXlcbiAgICAgIHRocm93IG5ldyBFcnJvciBcInNlY3JldEFjY2Vzc0tleSBpcyByZXF1aXJlZFwiXG5cbiAgICB1bmxlc3MgQHJlZ2lvblxuICAgICAgdGhyb3cgbmV3IEVycm9yIFwicmVnaW9uIGlzIHJlcXVpcmVkXCJcblxuICAgIHVubGVzcyBfLmlzU3RyaW5nIEBhY2Nlc3NLZXlJZFxuICAgICAgdGhyb3cgbmV3IEVycm9yIFwiYWNjZXNzS2V5SWQgbXVzdCBiZSBhIHN0cmluZ1wiXG5cbiAgICB1bmxlc3MgXy5pc1N0cmluZyBAc2VjcmV0QWNjZXNzS2V5XG4gICAgICB0aHJvdyBuZXcgRXJyb3IgXCJzZWNyZXRBY2Nlc3NLZXkgbXVzdCBiZSBhIHN0cmluZ1wiXG5cbiAgICB1bmxlc3MgXy5pc1N0cmluZyBAcmVnaW9uXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgXCJyZWdpb24gbXVzdCBiZSBhIHN0cmluZ1wiXG5cbiAgICBpZiBAc2lnbmF0dXJlVmVyc2lvbiBhbmQgbm90IF8uaXNTdHJpbmcgQHNpZ25hdHVyZVZlcnNpb25cbiAgICAgIHRocm93IG5ldyBFcnJvciBcInNpZ25hdHVyZVZlcnNpb24gbXVzdCBiZSBhIHN0cmluZ1wiXG5cbiAgICBpZiBAbWF4UmV0cmllcyBhbmQgbm90IF8uaXNJbnRlZ2VyIEBtYXhSZXRyaWVzXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ21heFJldHJpZXMgbXVzdCBiZSBhIGludGVnZXInXG5cbiAgICBpZiBAbWF4UmVkaXJlY3RzIGFuZCBub3QgXy5pc0ludGVnZXIgQG1heFJlZGlyZWN0c1xuICAgICAgdGhyb3cgbmV3IEVycm9yICdtYXhSZWRpcmVjdHMgbXVzdCBiZSBhIGludGVnZXInXG5cbiAgICBpZiBAc3lzdGVtQ2xvY2tPZmZzZXQgYW5kIG5vdCBfLmlzTnVtYmVyIEBzeXN0ZW1DbG9ja09mZnNldFxuICAgICAgdGhyb3cgbmV3IEVycm9yICdzeXN0ZW1DbG9ja09mZnNldCBtdXN0IGJlIGEgbnVtYmVyJ1xuXG4gICAgaWYgQHNzbEVuYWJsZWQgYW5kIG5vdCBfLmlzQm9vbGVhbiBAc3NsRW5hYmxlZFxuICAgICAgdGhyb3cgbmV3IEVycm9yICdzc2xFbmFibGVkIG11c3QgYmUgYSBib29sZWFuJ1xuXG4gICAgaWYgQHBhcmFtVmFsaWRhdGlvbiBhbmQgbm90IF8uaXNCb29sZWFuIEBwYXJhbVZhbGlkYXRpb25cbiAgICAgIHRocm93IG5ldyBFcnJvciAncGFyYW1WYWxpZGF0aW9uIG11c3QgYmUgYSBib29sZWFuJ1xuXG4gICAgaWYgQGNvbXB1dGVDaGVja3N1bXMgYW5kIG5vdCBfLmlzQm9vbGVhbiBAY29tcHV0ZUNoZWNrc3Vtc1xuICAgICAgdGhyb3cgbmV3IEVycm9yICdjb21wdXRlQ2hlY2tzdW1zIG11c3QgYmUgYSBib29sZWFuJ1xuXG4gICAgaWYgQGNvbnZlcnRSZXNwb25zZVR5cGVzIGFuZCBub3QgXy5pc0Jvb2xlYW4gQGNvbnZlcnRSZXNwb25zZVR5cGVzXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ2NvbnZlcnRSZXNwb25zZVR5cGVzIG11c3QgYmUgYSBib29sZWFuJ1xuXG4gICAgaWYgQHMzRm9yY2VQYXRoU3R5bGUgYW5kIG5vdCBfLmlzQm9vbGVhbiBAczNGb3JjZVBhdGhTdHlsZVxuICAgICAgdGhyb3cgbmV3IEVycm9yICdzM0ZvcmNlUGF0aFN0eWxlIG11c3QgYmUgYSBib29sZWFuJ1xuXG4gICAgaWYgQHMzQnVja2V0RW5kcG9pbnQgYW5kIG5vdCBfLmlzQm9vbGVhbiBAczNCdWNrZXRFbmRwb2ludFxuICAgICAgdGhyb3cgbmV3IEVycm9yICdzM0J1Y2tldEVuZHBvaW50IG11c3QgYmUgYSBib29sZWFuJ1xuXG4gICAgaWYgQGh0dHBPcHRpb25zIGFuZCBub3QgXy5pc1BsYWluT2JqZWN0IEBodHRwT3B0aW9uc1xuICAgICAgdGhyb3cgbmV3IEVycm9yICdodHRwT3B0aW9ucyBtdXN0IGJlIGEgZGljdCB3aXRoIHBhcmFtczogcHJveHksIGFnZW50LCB0aW1lb3V0LCB4aHJBc3luYywgeGhyV2l0aENyZWRlbnRpYWxzJ1xuXG4gICAgaWYgQGFwaVZlcnNpb25zIGFuZCBub3QgXy5pc1BsYWluT2JqZWN0IEBhcGlWZXJzaW9uc1xuICAgICAgdGhyb3cgbmV3IEVycm9yICdhcGlWZXJzaW9ucyBtdXN0IGJlIGEgZGljdCB3aXRoIHZlcnNpb25zJ1xuXG4gICAgaWYgQGFwaVZlcnNpb24gYW5kIG5vdCAoXy5pc1N0cmluZyBAYXBpVmVyc2lvbiBvciBfLmlzRGF0ZSBAYXBpVmVyc2lvbilcbiAgICAgIHRocm93IG5ldyBFcnJvciAnYXBpVmVyc2lvbiBtdXN0IGJlIGEgc3RyaW5nIG9yIGRhdGUnXG5cbiAgICBpZiBAc2Vzc2lvblRva2VuIGFuZCBub3QgQHNlc3Npb25Ub2tlbiBpbnN0YW5jZW9mIGF3cy5DcmVkZW50aWFsc1xuICAgICAgdGhyb3cgbmV3IEVycm9yICdzZXNzaW9uVG9rZW4gbXVzdCBiZSBhIEFXUy5DcmVkZW50aWFscydcblxuICAgIGlmIEBjcmVkZW50aWFscyBhbmQgbm90IEBjcmVkZW50aWFscyBpbnN0YW5jZW9mIGF3cy5DcmVkZW50aWFsc1xuICAgICAgdGhyb3cgbmV3IEVycm9yICdjcmVkZW50aWFscyBtdXN0IGJlIGEgQVdTLkNyZWRlbnRpYWxzJ1xuXG4gICAgaWYgQGNyZWRlbnRpYWxQcm92aWRlciBhbmQgbm90IEBjcmVkZW50aWFsUHJvdmlkZXIgaW5zdGFuY2VvZiBhd3MuQ3JlZGVudGlhbHNQcm92aWRlckNoYWluXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ2NyZWRlbnRpYWxQcm92aWRlciBtdXN0IGJlIGEgQVdTLkNyZWRlbnRpYWxzUHJvdmlkZXJDaGFpbidcblxuICAgIGlmIEBsb2dnZXIgYW5kIG5vdCAoQGxvZ2dlci53cml0ZSBhbmQgQGxvZ2dlci5sb2cpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ2xvZ2dlciBtdXN0IGhhdmUgI3dyaXRlIG9yICNsb2cgbWV0aG9kcydcblxuXG4jIEV4cG9ydHNcbm1vZHVsZS5leHBvcnRzID0gUzNDbGllbnRcblxuIl19
