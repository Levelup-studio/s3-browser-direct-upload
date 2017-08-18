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
    var acl, algorithm, arrAlgorithm, bucket, conditionMatching, contentLength, contentType, dateKey, dateLongPolicy, dateRegionKey, dateRegionServiceKey, dateShortPolicy, expires, extension, hashalg, key, policy, policyDoc, ref, ref1, ref2, ref3, ref4, ref5, ref6, region, s3ForcePathStyle, signature, signingKey, sigver, stream;
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
    params["Cache-Control"] = "max-age=31536000, immutable";
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGliL2luZGV4LmpzIiwic291cmNlcyI6WyJsaWIvaW5kZXguY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLElBQUEsaUNBQUE7RUFBQTs7QUFBQSxDQUFBLEdBQVUsT0FBQSxDQUFRLFFBQVI7O0FBQ1YsSUFBQSxHQUFVLE9BQUEsQ0FBUSxNQUFSOztBQUNWLE1BQUEsR0FBVSxPQUFBLENBQVEsUUFBUjs7QUFDVixNQUFBLEdBQVUsT0FBQSxDQUFRLFFBQVI7O0FBR0o7RUFDUyxrQkFBQyxPQUFELEVBQWUsd0JBQWY7QUFDWCxRQUFBOztNQURZLFVBQVU7O0lBQ3RCLEdBQUEsR0FBTSxPQUFBLENBQVEsU0FBUjtJQUVOLElBQUEsQ0FBQSxDQUE4QixPQUFBLFlBQW1CLEdBQUcsQ0FBQyxNQUFyRCxDQUFBO01BQUEsSUFBQyxDQUFBLGFBQUQsQ0FBZSxPQUFmLEVBQUE7O0lBQ0EsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFYLENBQWtCLE9BQWxCO0lBRUEsSUFBQyxDQUFBLEVBQUQsR0FBVSxJQUFBLEdBQUcsQ0FBQyxFQUFKLENBQUE7SUFFVixJQUFDLENBQUEsd0JBQUQsR0FBNEI7SUFDNUIsSUFBRyx3QkFBQSxJQUE2QixJQUFDLENBQUEsMkJBQUQsQ0FBNkIsd0JBQTdCLENBQWhDO01BQ0UsSUFBQyxDQUFBLHdCQUFELEdBQTRCLHlCQUQ5Qjs7RUFUVzs7cUJBY2IsY0FBQSxHQUFnQixTQUFDLE9BQUQsRUFBZSxFQUFmO0FBQ2QsUUFBQTs7TUFEZSxVQUFVOztJQUN6QixJQUFBLENBQThDLEVBQTlDO0FBQUEsWUFBVSxJQUFBLEtBQUEsQ0FBTSxzQkFBTixFQUFWOztJQUNFLDZCQUFGLEVBQWEsaUJBQWIsRUFBa0IsdUJBQWxCLEVBQTBCLHlCQUExQixFQUFtQyxpQkFBbkMsRUFBd0MscUNBQXhDLEVBQXVELDZCQUF2RCxFQUFrRSx1QkFBbEUsRUFBMEUsMkNBQTFFLEVBQTRGO0lBQzVGLEdBQUEsR0FBTSxPQUFPLENBQUM7SUFDZCxNQUFB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Q0UsWUFBVSxJQUFBLEtBQUEsQ0FBTSwyREFBTixFQURaOztJQUdBLElBQUcsSUFBQyxDQUFBLE1BQUQsSUFBWSxDQUFJLENBQUMsSUFBQyxDQUFBLE1BQU0sQ0FBQyxLQUFSLElBQWtCLElBQUMsQ0FBQSxNQUFNLENBQUMsR0FBM0IsQ0FBbkI7QUFDRSxZQUFVLElBQUEsS0FBQSxDQUFNLHlDQUFOLEVBRFo7O0VBekVhOzs7Ozs7QUE4RWpCLE1BQU0sQ0FBQyxPQUFQLEdBQWlCIiwic291cmNlc0NvbnRlbnQiOlsiIyBzMy1icm93c2VyLWRpcmVjdC11cGxvYWRcbl8gICAgICAgPSByZXF1aXJlKCdsb2Rhc2gnKVxubWltZSAgICA9IHJlcXVpcmUoJ21pbWUnKVxubW9tZW50ICA9IHJlcXVpcmUoJ21vbWVudCcpXG5jcnlwdG8gID0gcmVxdWlyZSgnY3J5cHRvJylcblxuXG5jbGFzcyBTM0NsaWVudFxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMgPSB7fSwgYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zKSAtPlxuICAgIGF3cyA9IHJlcXVpcmUoJ2F3cy1zZGsnKVxuXG4gICAgQF9jaGVja09wdGlvbnMgb3B0aW9ucyB1bmxlc3Mgb3B0aW9ucyBpbnN0YW5jZW9mIGF3cy5Db25maWdcbiAgICBhd3MuY29uZmlnLnVwZGF0ZSBvcHRpb25zXG5cbiAgICBAczMgPSBuZXcgYXdzLlMzKClcblxuICAgIEBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnMgPSBudWxsXG4gICAgaWYgYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zIGFuZCBAX2NoZWNrQWxsb3dlZERhdGFFeHRlbnNpb25zIGFyckFsbG93ZWREYXRhRXh0ZW5zaW9uc1xuICAgICAgQGFyckFsbG93ZWREYXRhRXh0ZW5zaW9ucyA9IGFyckFsbG93ZWREYXRhRXh0ZW5zaW9uc1xuXG5cbiAgIyBCcm93c2VyIGZvcm0gcG9zdCBwYXJhbXMgZm9yIHVwbG9hZGluZ1xuICB1cGxvYWRQb3N0Rm9ybTogKG9wdGlvbnMgPSB7fSwgY2IpIC0+XG4gICAgdGhyb3cgbmV3IEVycm9yICdDYWxsYmFjayBpcyByZXF1aXJlZCcgdW5sZXNzIGNiXG4gICAgeyBleHRlbnNpb24sIGtleSwgYnVja2V0LCBleHBpcmVzLCBhY2wsIGNvbnRlbnRMZW5ndGgsIGFsZ29yaXRobSwgcmVnaW9uLCBzM0ZvcmNlUGF0aFN0eWxlLCBjb25kaXRpb25NYXRjaGluZyB9ID0gb3B0aW9uc1xuICAgIGtleSA9IG9wdGlvbnMua2V5XG4gICAgYnVja2V0ID0gb3B0aW9ucy5idWNrZXRcbiAgICByZWdpb24gPSBvcHRpb25zLnJlZ2lvblxuICAgIGV4dGVuc2lvbiA9IG9wdGlvbnMuZXh0ZW5zaW9uID8gbnVsbFxuICAgIGV4cGlyZXMgPSBvcHRpb25zLmV4cGlyZXMgPyBtb21lbnQudXRjKCkuYWRkKDYwLCAnbWludXRlcycpLnRvRGF0ZSgpXG4gICAgYWNsID0gb3B0aW9ucy5hY2wgPyAncHVibGljLXJlYWQnXG4gICAgY29udGVudExlbmd0aCA9IG9wdGlvbnMuY29udGVudExlbmd0aCA/IG51bGxcbiAgICBhbGdvcml0aG0gPSBvcHRpb25zLmFsZ29yaXRobSA/ICdBV1M0LUhNQUMtU0hBMjU2J1xuICAgIHJlZ2lvbiA9IG9wdGlvbnMucmVnaW9uID8gQHJlZ2lvblxuICAgIGNvbmRpdGlvbk1hdGNoaW5nID0gb3B0aW9ucy5jb25kaXRpb25NYXRjaGluZyA/IG51bGxcblxuICAgICMgQFRPRE8gb3B0aW9ucyB0eXBlIGNoZWNrXG4gICAgdW5sZXNzIGtleSBhbmQgYnVja2V0XG4gICAgICByZXR1cm4gY2IgbmV3IEVycm9yICdrZXkgYW5kIGJ1Y2tldCBhcmUgcmVxdWlyZWQnXG5cbiAgICBpZiBleHRlbnNpb25cbiAgICAgIGNvbnRlbnRUeXBlID0gQF9jaGVja0RhdGFFeHRlbnNpb24gZXh0ZW5zaW9uXG4gICAgICByZXR1cm4gY2IgbmV3IEVycm9yICdEYXRhIGV4dGVuc2lvbiBub3QgYWxsb3dlZCcgdW5sZXNzIGNvbnRlbnRUeXBlXG5cbiAgICBpZiBhbGdvcml0aG0uc3BsaXQoJy0nKS5sZW5ndGggPT0gM1xuICAgICAgYXJyQWxnb3JpdGhtID0gYWxnb3JpdGhtLnNwbGl0KCctJylcbiAgICAgIHNpZ3ZlciA9IGFyckFsZ29yaXRobVswXVxuICAgICAgaGFzaGFsZyA9IGFyckFsZ29yaXRobVsyXS50b0xvd2VyQ2FzZSgpXG4gICAgZWxzZVxuICAgICAgc2lndmVyID0gXCJBV1M0XCJcbiAgICAgIGhhc2hhbGcgPSBcInNoYTI1NlwiXG5cbiAgICBwb2xpY3lEb2MgPSB7fVxuXG4gICAgcG9saWN5RG9jW1wiZXhwaXJhdGlvblwiXSA9IG1vbWVudC51dGMoZXhwaXJlcykuZm9ybWF0KFwiWVlZWS1NTS1ERFtUXUhIOk1NOlNTW1pdXCIpIGlmIGV4cGlyZXMgYW5kIF8uaXNEYXRlIGV4cGlyZXNcbiAgICBwb2xpY3lEb2NbXCJjb25kaXRpb25zXCJdID0gW11cblxuICAgIGRhdGVTaG9ydFBvbGljeSA9IG1vbWVudC51dGMoKS5mb3JtYXQoJ1lZWVlNTUREJylcbiAgICBkYXRlTG9uZ1BvbGljeSA9IG1vbWVudC51dGMoKS5mb3JtYXQoJ1lZWVlNTUREW1RdSEhNTVNTW1pdJylcblxuICAgIHBvbGljeURvYy5jb25kaXRpb25zLnB1c2ggeyAnYnVja2V0JzogYnVja2V0IH1cbiAgICBwb2xpY3lEb2MuY29uZGl0aW9ucy5wdXNoIFsgJ3N0YXJ0cy13aXRoJywgJyRrZXknLCBrZXkgXVxuICAgIHBvbGljeURvYy5jb25kaXRpb25zLnB1c2ggeyAnYWNsJzogYWNsIH1cbiAgICBwb2xpY3lEb2MuY29uZGl0aW9ucy5wdXNoIFsgJ3N0YXJ0cy13aXRoJywgJyRDb250ZW50LVR5cGUnLCAnJyBdIGlmIGNvbnRlbnRUeXBlXG4gICAgcG9saWN5RG9jLmNvbmRpdGlvbnMucHVzaCBbICdjb250ZW50LWxlbmd0aC1yYW5nZScsIDAsIGNvbnRlbnRMZW5ndGggXSBpZiBjb250ZW50TGVuZ3RoXG4gICAgcG9saWN5RG9jLmNvbmRpdGlvbnMucHVzaCB7IFwieC1hbXotYWxnb3JpdGhtXCI6IGFsZ29yaXRobSB9XG4gICAgcG9saWN5RG9jLmNvbmRpdGlvbnMucHVzaCB7IFwieC1hbXotY3JlZGVudGlhbFwiOiBcIiN7QGFjY2Vzc0tleUlkfS8je2RhdGVTaG9ydFBvbGljeX0vI3tyZWdpb259L3MzL2F3czRfcmVxdWVzdFwiIH1cbiAgICBwb2xpY3lEb2MuY29uZGl0aW9ucy5wdXNoIHsgXCJ4LWFtei1kYXRlXCI6IGRhdGVMb25nUG9saWN5fVxuXG4gICAgaWYgY29uZGl0aW9uTWF0Y2hpbmcgYW5kIF8uaXNBcnJheSBjb25kaXRpb25NYXRjaGluZ1xuICAgICAgcG9saWN5RG9jLmNvbmRpdGlvbnMgPSBfLnVuaW9uIGNvbmRpdGlvbk1hdGNoaW5nLCBwb2xpY3lEb2MuY29uZGl0aW9uc1xuXG4gICAgZGF0ZUtleSA9IGNyeXB0by5jcmVhdGVIbWFjKGhhc2hhbGcsIFwiI3tzaWd2ZXJ9I3tAc2VjcmV0QWNjZXNzS2V5fVwiKS51cGRhdGUoZGF0ZVNob3J0UG9saWN5KS5kaWdlc3QoKVxuICAgIGRhdGVSZWdpb25LZXkgPSBjcnlwdG8uY3JlYXRlSG1hYyhoYXNoYWxnLCBkYXRlS2V5KS51cGRhdGUocmVnaW9uKS5kaWdlc3QoKVxuICAgIGRhdGVSZWdpb25TZXJ2aWNlS2V5ID0gY3J5cHRvLmNyZWF0ZUhtYWMoaGFzaGFsZywgZGF0ZVJlZ2lvbktleSkudXBkYXRlKCdzMycpLmRpZ2VzdCgpXG4gICAgc2lnbmluZ0tleSA9IGNyeXB0by5jcmVhdGVIbWFjKGhhc2hhbGcsIGRhdGVSZWdpb25TZXJ2aWNlS2V5KS51cGRhdGUoXCIje3NpZ3Zlci50b0xvd2VyQ2FzZSgpfV9yZXF1ZXN0XCIpLmRpZ2VzdCgpXG4gICAgcG9saWN5ID0gbmV3IEJ1ZmZlcihKU09OLnN0cmluZ2lmeShwb2xpY3lEb2MpKS50b1N0cmluZygnYmFzZTY0JylcbiAgICBzaWduYXR1cmUgPSBjcnlwdG8uY3JlYXRlSG1hYyhoYXNoYWxnLHNpZ25pbmdLZXkpLnVwZGF0ZShwb2xpY3kpLmRpZ2VzdCgnaGV4JylcblxuICAgIHN0cmVhbSA9IHt9XG4gICAgc3RyZWFtWydwYXJhbXMnXSA9XG4gICAgICBcImtleVwiOiBrZXlcbiAgICAgIFwiYWNsXCI6IGFjbFxuICAgICAgXCJ4LWFtei1hbGdvcml0aG1cIjogYWxnb3JpdGhtXG4gICAgICBcIngtYW16LWNyZWRlbnRpYWxcIjogXCIje0BhY2Nlc3NLZXlJZH0vI3tkYXRlU2hvcnRQb2xpY3l9LyN7cmVnaW9ufS9zMy8je3NpZ3Zlci50b0xvd2VyQ2FzZSgpfV9yZXF1ZXN0XCJcbiAgICAgIFwieC1hbXotZGF0ZVwiOiBkYXRlTG9uZ1BvbGljeVxuICAgICAgXCJwb2xpY3lcIjogcG9saWN5XG4gICAgICBcIngtYW16LXNpZ25hdHVyZVwiOiBzaWduYXR1cmVcbiAgICBzdHJlYW0ucGFyYW1zWydjb250ZW50LXR5cGUnXSA9IGNvbnRlbnRUeXBlIGlmIGNvbnRlbnRUeXBlXG4gICAgc3RyZWFtWydjb25kaXRpb25zJ10gID0gY29uZGl0aW9uTWF0Y2hpbmcgaWYgY29uZGl0aW9uTWF0Y2hpbmdcbiAgICBpZiB0aGlzLnMzRm9yY2VQYXRoU3R5bGVcbiAgICAgIHN0cmVhbVsncHVibGljX3VybCddICA9IFwiaHR0cHM6Ly9zMy0je3JlZ2lvbn0uYW1hem9uYXdzLmNvbS8je2J1Y2tldH0vI3trZXl9XCJcbiAgICAgIHN0cmVhbVsnZm9ybV91cmwnXSAgICA9IFwiaHR0cHM6Ly9zMy0je3JlZ2lvbn0uYW1hem9uYXdzLmNvbS8je2J1Y2tldH0vXCJcbiAgICBlbHNlXG4gICAgICBzdHJlYW1bJ3B1YmxpY191cmwnXSAgPSBcImh0dHBzOi8vI3tidWNrZXR9LnMzLmFtYXpvbmF3cy5jb20vI3trZXl9XCJcbiAgICAgIHN0cmVhbVsnZm9ybV91cmwnXSAgICA9IFwiaHR0cHM6Ly8je2J1Y2tldH0uczMuYW1hem9uYXdzLmNvbS9cIlxuICAgIGNiIG51bGwsIHN0cmVhbVxuXG5cbiAgIyBTMy51cGxvYWRcbiAgdXBsb2FkOiAob3B0aW9ucyA9IHt9LCBjYikgLT5cbiAgICB0aHJvdyBuZXcgRXJyb3IgJ0NhbGxiYWNrIGlzIHJlcXVpcmVkJyB1bmxlc3MgY2JcbiAgICB7IGRhdGEsIGV4dGVuc2lvbiwga2V5LCBidWNrZXQsIGV4cGlyZXMsIGFjbCwgY29udGVudExlbmd0aCB9ID0gb3B0aW9uc1xuICAgIGRhdGEgPSBvcHRpb25zLmRhdGFcbiAgICBrZXkgPSBvcHRpb25zLmtleVxuICAgIGJ1Y2tldCA9IG9wdGlvbnMuYnVja2V0XG4gICAgZXh0ZW5zaW9uID0gb3B0aW9ucy5leHRlbnNpb24gPyBudWxsXG4gICAgZXhwaXJlcyA9IG9wdGlvbnMuZXhwaXJlcyA/IG51bGxcbiAgICBhY2wgPSBvcHRpb25zLmFjbCA/IG51bGxcbiAgICBjb250ZW50TGVuZ3RoID0gb3B0aW9ucy5jb250ZW50TGVuZ3RoID8gbnVsbFxuICAgIFxuICAgICMgQFRPRE8gb3B0aW9ucyB0eXBlIGNoZWNrXG4gICAgdW5sZXNzIGRhdGEgYW5kIGtleSBhbmQgYnVja2V0XG4gICAgICByZXR1cm4gY2IgbmV3IEVycm9yICdkYXRhLCBrZXkgYW5kIGJ1Y2tldCBhcmUgcmVxdWlyZWQnXG5cbiAgICBwYXJhbXMgPVxuICAgICAgQnVja2V0OiBidWNrZXRcbiAgICAgIEtleToga2V5XG4gICAgICBCb2R5OiBkYXRhXG5cbiAgICBpZiBleHRlbnNpb25cbiAgICAgIGNvbnRlbnRUeXBlID0gQF9jaGVja0RhdGFFeHRlbnNpb24gZXh0ZW5zaW9uXG4gICAgICByZXR1cm4gY2IgbmV3IEVycm9yICdEYXRhIGV4dGVuc2lvbiBub3QgYWxsb3dlZCcgdW5sZXNzIGNvbnRlbnRUeXBlXG4gICAgICBwYXJhbXNbXCJDb250ZW50VHlwZVwiXSA9IGNvbnRlbnRUeXBlXG5cbiAgICBwYXJhbXNbXCJDYWNoZS1Db250cm9sXCJdID0gXCJtYXgtYWdlPTMxNTM2MDAwLCBpbW11dGFibGVcIlxuICAgIHBhcmFtc1tcIkV4cGlyZXNcIl0gPSBtb21lbnQudXRjKGV4cGlyZXMpIGlmIGV4cGlyZXMgYW5kIF8uaXNEYXRlIGV4cGlyZXNcbiAgICBwYXJhbXNbXCJBQ0xcIl0gPSBhY2wgaWYgYWNsXG4gICAgcGFyYW1zW1wiQ29udGVudExlbmd0aFwiXSA9IGNvbnRlbnRMZW5ndGggaWYgY29udGVudExlbmd0aFxuXG4gICAgQHMzLnVwbG9hZCBwYXJhbXMsIChlcnIsIGRhdGEpIC0+XG4gICAgICByZXR1cm4gY2IgZXJyIGlmIGVyclxuICAgICAgY2IgbnVsbCwgXCJodHRwczovLyN7YnVja2V0fS5zMy5hbWF6b25hd3MuY29tLyN7a2V5fVwiXG5cblxuICAjIFMzLnB1dE9iamVjdFxuICBwdXQ6IChvcHRpb25zID0ge30sIGNiKSAtPlxuICAgIHRocm93IG5ldyBFcnJvciAnQ2FsbGJhY2sgaXMgcmVxdWlyZWQnIHVubGVzcyBjYlxuICAgIHsgZXh0ZW5zaW9uLCBrZXksIGJ1Y2tldCwgZXhwaXJlcywgYWNsLCBjb250ZW50TGVuZ3RoIH0gPSBvcHRpb25zXG4gICAga2V5ID0gb3B0aW9ucy5rZXlcbiAgICBidWNrZXQgPSBvcHRpb25zLmJ1Y2tldFxuICAgIGV4dGVuc2lvbiA9IG9wdGlvbnMuZXh0ZW5zaW9uID8gbnVsbFxuICAgIGV4cGlyZXMgPSBvcHRpb25zLmV4cGlyZXMgPyBudWxsXG4gICAgYWNsID0gb3B0aW9ucy5hY2wgPyBudWxsXG5cbiAgICAjIEBUT0RPIG9wdGlvbnMgdHlwZSBjaGVja1xuICAgIHVubGVzcyBrZXkgYW5kIGJ1Y2tldFxuICAgICAgcmV0dXJuIGNiIG5ldyBFcnJvciAna2V5IGFuZCBidWNrZXQgYXJlIHJlcXVpcmVkJ1xuXG4gICAgcGFyYW1zID1cbiAgICAgIEJ1Y2tldDogYnVja2V0XG4gICAgICBLZXk6IGtleVxuXG4gICAgaWYgZXh0ZW5zaW9uXG4gICAgICBjb250ZW50VHlwZSA9IEBfY2hlY2tEYXRhRXh0ZW5zaW9uIGV4dGVuc2lvblxuICAgICAgcmV0dXJuIGNiIG5ldyBFcnJvciAnRGF0YSBleHRlbnNpb24gbm90IGFsbG93ZWQnIHVubGVzcyBjb250ZW50VHlwZVxuICAgICAgcGFyYW1zW1wiQ29udGVudFR5cGVcIl0gPSBjb250ZW50VHlwZVxuXG4gICAgcGFyYW1zW1wiQ2FjaGUtQ29udHJvbFwiXSA9IFwibWF4LWFnZT0zMTUzNjAwMCwgaW1tdXRhYmxlXCJcbiAgICBwYXJhbXNbXCJFeHBpcmVzXCJdID0gbW9tZW50LnV0YyhleHBpcmVzKSBpZiBleHBpcmVzIGFuZCBfLmlzRGF0ZSBleHBpcmVzXG4gICAgcGFyYW1zW1wiQUNMXCJdID0gYWNsIGlmIGFjbFxuXG4gICAgQHMzLmdldFNpZ25lZFVybCBcInB1dE9iamVjdFwiLCBwYXJhbXMsIChlcnIsIGRhdGEpIC0+XG4gICAgICByZXR1cm4gY2IgZXJyIGlmIGVyclxuXG4gICAgICBwdXQgPVxuICAgICAgICAnc2lnbmVkX3VybCc6IGRhdGFcbiAgICAgICAgJ3B1YmxpY191cmwnOiBcImh0dHBzOi8vI3tidWNrZXR9LnMzLmFtYXpvbmF3cy5jb20vI3trZXl9XCJcblxuICAgICAgY2IgbnVsbCwgcHV0XG5cblxuICAjIENoZWNrIGRhdGEgdHlwZSBmcm9tIGFyckFsbG93ZWREYXRhRXh0ZW5zaW9uc1xuICBfY2hlY2tEYXRhRXh0ZW5zaW9uOiAoZGF0YUV4dGVuc2lvbikgLT5cbiAgICByZXR1cm4gZmFsc2UgaWYgbm90IGRhdGFFeHRlbnNpb24gb3IgKEBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnMgYW5kIGRhdGFFeHRlbnNpb24gbm90IGluIEBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnMpXG4gICAgcmV0dXJuIG1pbWUubG9va3VwIGRhdGFFeHRlbnNpb25cblxuXG4gICMgQ2hlY2sgYWxsb3dlZCBkYXRhIHR5cGVzXG4gIF9jaGVja0FsbG93ZWREYXRhRXh0ZW5zaW9uczogKGFyckFsbG93ZWREYXRhRXh0ZW5zaW9ucykgLT5cbiAgICByZXR1cm4gZmFsc2UgdW5sZXNzIGFyckFsbG93ZWREYXRhRXh0ZW5zaW9uc1xuXG4gICAgdW5sZXNzIF8uaXNBcnJheSBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnNcbiAgICAgIHRocm93IG5ldyBFcnJvciBcIkFsbG93ZWQgZGF0YSBleHRlbnNpb25zIG11c3QgYmUgYXJyYXkgb2Ygc3RyaW5nc1wiXG5cbiAgICBmb3IgZXh0IG9mIGFyckFsbG93ZWREYXRhRXh0ZW5zaW9uc1xuICAgICAgdW5sZXNzIF8uaXNTdHJpbmcgZXh0XG4gICAgICAgIHRocm93IG5ldyBFcnJvciBcIkV4dGVuc2lvbnMgbXVzdCBiZSBhIHN0cmluZ3NcIlxuXG4gICAgcmV0dXJuIHRydWVcblxuXG4gICMgQ2hlY2sgb3B0aW9ucyBwYXJhbXNcbiAgX2NoZWNrT3B0aW9uczogKG9wdGlvbnMgPSB7fSkgLT5cbiAgICB7XG4gICAgICBAYWNjZXNzS2V5SWQsIEBzZWNyZXRBY2Nlc3NLZXksIEByZWdpb24sIEBzaWduYXR1cmVWZXJzaW9uLCBAbWF4UmV0cmllcywgQG1heFJlZGlyZWN0cywgQHN5c3RlbUNsb2NrT2Zmc2V0LFxuICAgICAgQHNzbEVuYWJsZWQsIEBwYXJhbVZhbGlkYXRpb24sIEBjb21wdXRlQ2hlY2tzdW1zLCBAY29udmVydFJlc3BvbnNlVHlwZXMsIEBzM0ZvcmNlUGF0aFN0eWxlLCBAczNCdWNrZXRFbmRwb2ludCxcbiAgICAgIEBhcGlWZXJzaW9uLCBAaHR0cE9wdGlvbnMsIEBhcGlWZXJzaW9ucywgQHNlc3Npb25Ub2tlbiwgQGNyZWRlbnRpYWxzLCBAY3JlZGVudGlhbFByb3ZpZGVyLCBAbG9nZ2VyXG4gICAgfSA9IG9wdGlvbnNcblxuICAgIHVubGVzcyBAYWNjZXNzS2V5SWRcbiAgICAgIHRocm93IG5ldyBFcnJvciBcImFjY2Vzc0tleUlkIGlzIHJlcXVpcmVkXCJcblxuICAgIHVubGVzcyBAc2VjcmV0QWNjZXNzS2V5XG4gICAgICB0aHJvdyBuZXcgRXJyb3IgXCJzZWNyZXRBY2Nlc3NLZXkgaXMgcmVxdWlyZWRcIlxuXG4gICAgdW5sZXNzIEByZWdpb25cbiAgICAgIHRocm93IG5ldyBFcnJvciBcInJlZ2lvbiBpcyByZXF1aXJlZFwiXG5cbiAgICB1bmxlc3MgXy5pc1N0cmluZyBAYWNjZXNzS2V5SWRcbiAgICAgIHRocm93IG5ldyBFcnJvciBcImFjY2Vzc0tleUlkIG11c3QgYmUgYSBzdHJpbmdcIlxuXG4gICAgdW5sZXNzIF8uaXNTdHJpbmcgQHNlY3JldEFjY2Vzc0tleVxuICAgICAgdGhyb3cgbmV3IEVycm9yIFwic2VjcmV0QWNjZXNzS2V5IG11c3QgYmUgYSBzdHJpbmdcIlxuXG4gICAgdW5sZXNzIF8uaXNTdHJpbmcgQHJlZ2lvblxuICAgICAgdGhyb3cgbmV3IEVycm9yIFwicmVnaW9uIG11c3QgYmUgYSBzdHJpbmdcIlxuXG4gICAgaWYgQHNpZ25hdHVyZVZlcnNpb24gYW5kIG5vdCBfLmlzU3RyaW5nIEBzaWduYXR1cmVWZXJzaW9uXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgXCJzaWduYXR1cmVWZXJzaW9uIG11c3QgYmUgYSBzdHJpbmdcIlxuXG4gICAgaWYgQG1heFJldHJpZXMgYW5kIG5vdCBfLmlzSW50ZWdlciBAbWF4UmV0cmllc1xuICAgICAgdGhyb3cgbmV3IEVycm9yICdtYXhSZXRyaWVzIG11c3QgYmUgYSBpbnRlZ2VyJ1xuXG4gICAgaWYgQG1heFJlZGlyZWN0cyBhbmQgbm90IF8uaXNJbnRlZ2VyIEBtYXhSZWRpcmVjdHNcbiAgICAgIHRocm93IG5ldyBFcnJvciAnbWF4UmVkaXJlY3RzIG11c3QgYmUgYSBpbnRlZ2VyJ1xuXG4gICAgaWYgQHN5c3RlbUNsb2NrT2Zmc2V0IGFuZCBub3QgXy5pc051bWJlciBAc3lzdGVtQ2xvY2tPZmZzZXRcbiAgICAgIHRocm93IG5ldyBFcnJvciAnc3lzdGVtQ2xvY2tPZmZzZXQgbXVzdCBiZSBhIG51bWJlcidcblxuICAgIGlmIEBzc2xFbmFibGVkIGFuZCBub3QgXy5pc0Jvb2xlYW4gQHNzbEVuYWJsZWRcbiAgICAgIHRocm93IG5ldyBFcnJvciAnc3NsRW5hYmxlZCBtdXN0IGJlIGEgYm9vbGVhbidcblxuICAgIGlmIEBwYXJhbVZhbGlkYXRpb24gYW5kIG5vdCBfLmlzQm9vbGVhbiBAcGFyYW1WYWxpZGF0aW9uXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ3BhcmFtVmFsaWRhdGlvbiBtdXN0IGJlIGEgYm9vbGVhbidcblxuICAgIGlmIEBjb21wdXRlQ2hlY2tzdW1zIGFuZCBub3QgXy5pc0Jvb2xlYW4gQGNvbXB1dGVDaGVja3N1bXNcbiAgICAgIHRocm93IG5ldyBFcnJvciAnY29tcHV0ZUNoZWNrc3VtcyBtdXN0IGJlIGEgYm9vbGVhbidcblxuICAgIGlmIEBjb252ZXJ0UmVzcG9uc2VUeXBlcyBhbmQgbm90IF8uaXNCb29sZWFuIEBjb252ZXJ0UmVzcG9uc2VUeXBlc1xuICAgICAgdGhyb3cgbmV3IEVycm9yICdjb252ZXJ0UmVzcG9uc2VUeXBlcyBtdXN0IGJlIGEgYm9vbGVhbidcblxuICAgIGlmIEBzM0ZvcmNlUGF0aFN0eWxlIGFuZCBub3QgXy5pc0Jvb2xlYW4gQHMzRm9yY2VQYXRoU3R5bGVcbiAgICAgIHRocm93IG5ldyBFcnJvciAnczNGb3JjZVBhdGhTdHlsZSBtdXN0IGJlIGEgYm9vbGVhbidcblxuICAgIGlmIEBzM0J1Y2tldEVuZHBvaW50IGFuZCBub3QgXy5pc0Jvb2xlYW4gQHMzQnVja2V0RW5kcG9pbnRcbiAgICAgIHRocm93IG5ldyBFcnJvciAnczNCdWNrZXRFbmRwb2ludCBtdXN0IGJlIGEgYm9vbGVhbidcblxuICAgIGlmIEBodHRwT3B0aW9ucyBhbmQgbm90IF8uaXNQbGFpbk9iamVjdCBAaHR0cE9wdGlvbnNcbiAgICAgIHRocm93IG5ldyBFcnJvciAnaHR0cE9wdGlvbnMgbXVzdCBiZSBhIGRpY3Qgd2l0aCBwYXJhbXM6IHByb3h5LCBhZ2VudCwgdGltZW91dCwgeGhyQXN5bmMsIHhocldpdGhDcmVkZW50aWFscydcblxuICAgIGlmIEBhcGlWZXJzaW9ucyBhbmQgbm90IF8uaXNQbGFpbk9iamVjdCBAYXBpVmVyc2lvbnNcbiAgICAgIHRocm93IG5ldyBFcnJvciAnYXBpVmVyc2lvbnMgbXVzdCBiZSBhIGRpY3Qgd2l0aCB2ZXJzaW9ucydcblxuICAgIGlmIEBhcGlWZXJzaW9uIGFuZCBub3QgKF8uaXNTdHJpbmcgQGFwaVZlcnNpb24gb3IgXy5pc0RhdGUgQGFwaVZlcnNpb24pXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ2FwaVZlcnNpb24gbXVzdCBiZSBhIHN0cmluZyBvciBkYXRlJ1xuXG4gICAgaWYgQHNlc3Npb25Ub2tlbiBhbmQgbm90IEBzZXNzaW9uVG9rZW4gaW5zdGFuY2VvZiBhd3MuQ3JlZGVudGlhbHNcbiAgICAgIHRocm93IG5ldyBFcnJvciAnc2Vzc2lvblRva2VuIG11c3QgYmUgYSBBV1MuQ3JlZGVudGlhbHMnXG5cbiAgICBpZiBAY3JlZGVudGlhbHMgYW5kIG5vdCBAY3JlZGVudGlhbHMgaW5zdGFuY2VvZiBhd3MuQ3JlZGVudGlhbHNcbiAgICAgIHRocm93IG5ldyBFcnJvciAnY3JlZGVudGlhbHMgbXVzdCBiZSBhIEFXUy5DcmVkZW50aWFscydcblxuICAgIGlmIEBjcmVkZW50aWFsUHJvdmlkZXIgYW5kIG5vdCBAY3JlZGVudGlhbFByb3ZpZGVyIGluc3RhbmNlb2YgYXdzLkNyZWRlbnRpYWxzUHJvdmlkZXJDaGFpblxuICAgICAgdGhyb3cgbmV3IEVycm9yICdjcmVkZW50aWFsUHJvdmlkZXIgbXVzdCBiZSBhIEFXUy5DcmVkZW50aWFsc1Byb3ZpZGVyQ2hhaW4nXG5cbiAgICBpZiBAbG9nZ2VyIGFuZCBub3QgKEBsb2dnZXIud3JpdGUgYW5kIEBsb2dnZXIubG9nKVxuICAgICAgdGhyb3cgbmV3IEVycm9yICdsb2dnZXIgbXVzdCBoYXZlICN3cml0ZSBvciAjbG9nIG1ldGhvZHMnXG5cblxuIyBFeHBvcnRzXG5tb2R1bGUuZXhwb3J0cyA9IFMzQ2xpZW50XG5cbiJdfQ==
