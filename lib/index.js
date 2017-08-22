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
    if (contentDisposition) {
      policyDoc.conditions.push({
        'content-disposition': contentDisposition
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
    if (contentDisposition) {
      stream.params['content-disposition'] = contentDisposition;
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGliL2luZGV4LmpzIiwic291cmNlcyI6WyJsaWIvaW5kZXguY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLElBQUEsaUNBQUE7RUFBQTs7QUFBQSxDQUFBLEdBQVUsT0FBQSxDQUFRLFFBQVI7O0FBQ1YsSUFBQSxHQUFVLE9BQUEsQ0FBUSxNQUFSOztBQUNWLE1BQUEsR0FBVSxPQUFBLENBQVEsUUFBUjs7QUFDVixNQUFBLEdBQVUsT0FBQSxDQUFRLFFBQVI7O0FBR0o7RUFDUyxrQkFBQyxPQUFELEVBQWUsd0JBQWY7QUFDWCxRQUFBOztNQURZLFVBQVU7O0lBQ3RCLEdBQUEsR0FBTSxPQUFBLENBQVEsU0FBUjtJQUVOLElBQUEsQ0FBQSxDQUE4QixPQUFBLFlBQW1CLEdBQUcsQ0FBQyxNQUFyRCxDQUFBO01BQUEsSUFBQyxDQUFBLGFBQUQsQ0FBZSxPQUFmLEVBQUE7O0lBQ0EsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFYLENBQWtCLE9BQWxCO0lBRUEsSUFBQyxDQUFBLEVBQUQsR0FBVSxJQUFBLEdBQUcsQ0FBQyxFQUFKLENBQUE7SUFFVixJQUFDLENBQUEsd0JBQUQsR0FBNEI7SUFDNUIsSUFBRyx3QkFBQSxJQUE2QixJQUFDLENBQUEsMkJBQUQsQ0FBNkIsd0JBQTdCLENBQWhDO01BQ0UsSUFBQyxDQUFBLHdCQUFELEdBQTRCLHlCQUQ5Qjs7RUFUVzs7cUJBY2IsY0FBQSxHQUFnQixTQUFDLE9BQUQsRUFBZSxFQUFmO0FBQ2QsUUFBQTs7TUFEZSxVQUFVOztJQUN6QixJQUFBLENBQThDLEVBQTlDO0FBQUEsWUFBVSxJQUFBLEtBQUEsQ0FBTSxzQkFBTixFQUFWOztJQUNFLDZCQUFGLEVBQWEsaUJBQWIsRUFBa0IsdUJBQWxCLEVBQTBCLHlCQUExQixFQUFtQyxpQkFBbkMsRUFBd0MscUNBQXhDLEVBQXVELDZCQUF2RCxFQUFrRSx1QkFBbEUsRUFBMEUsMkNBQTFFLEVBQTRGO0lBQzVGLEdBQUEsR0FBTSxPQUFPLENBQUM7SUFDZCxNQUFB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LFVBQUQsSUFBZ0IsQ0FBSSxDQUFDLENBQUMsQ0FBQyxRQUFGLENBQVcsSUFBQyxDQUFBLFVBQUQsSUFBZSxDQUFDLENBQUMsTUFBRixDQUFTLElBQUMsQ0FBQSxVQUFWLENBQTFCLENBQUQsQ0FBdkI7QUFDRSxZQUFVLElBQUEsS0FBQSxDQUFNLHFDQUFOLEVBRFo7O0lBR0EsSUFBRyxJQUFDLENBQUEsWUFBRCxJQUFrQixDQUFJLElBQUMsQ0FBQSxZQUFMLFlBQTZCLEdBQUcsQ0FBQyxXQUF0RDtBQUNFLFlBQVUsSUFBQSxLQUFBLENBQU0sd0NBQU4sRUFEWjs7SUFHQSxJQUFHLElBQUMsQ0FBQSxXQUFELElBQWlCLENBQUksSUFBQyxDQUFBLFdBQUwsWUFBNEIsR0FBRyxDQUFDLFdBQXBEO0FBQ0UsWUFBVSxJQUFBLEtBQUEsQ0FBTSx1Q0FBTixFQURaOztJQUdBLElBQUcsSUFBQyxDQUFBLGtCQUFELElBQXdCLENBQUksSUFBQyxDQUFBLGtCQUFMLFlBQW1DLEdBQUcsQ0FBQyx3QkFBbEU7QUFDRSxZQUFVLElBQUEsS0FBQSxDQUFNLDJEQUFOLEVBRFo7O0lBR0EsSUFBRyxJQUFDLENBQUEsTUFBRCxJQUFZLENBQUksQ0FBQyxJQUFDLENBQUEsTUFBTSxDQUFDLEtBQVIsSUFBa0IsSUFBQyxDQUFBLE1BQU0sQ0FBQyxHQUEzQixDQUFuQjtBQUNFLFlBQVUsSUFBQSxLQUFBLENBQU0seUNBQU4sRUFEWjs7RUF6RWE7Ozs7OztBQThFakIsTUFBTSxDQUFDLE9BQVAsR0FBaUIiLCJzb3VyY2VzQ29udGVudCI6WyIjIHMzLWJyb3dzZXItZGlyZWN0LXVwbG9hZFxuXyAgICAgICA9IHJlcXVpcmUoJ2xvZGFzaCcpXG5taW1lICAgID0gcmVxdWlyZSgnbWltZScpXG5tb21lbnQgID0gcmVxdWlyZSgnbW9tZW50JylcbmNyeXB0byAgPSByZXF1aXJlKCdjcnlwdG8nKVxuXG5cbmNsYXNzIFMzQ2xpZW50XG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucyA9IHt9LCBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnMpIC0+XG4gICAgYXdzID0gcmVxdWlyZSgnYXdzLXNkaycpXG5cbiAgICBAX2NoZWNrT3B0aW9ucyBvcHRpb25zIHVubGVzcyBvcHRpb25zIGluc3RhbmNlb2YgYXdzLkNvbmZpZ1xuICAgIGF3cy5jb25maWcudXBkYXRlIG9wdGlvbnNcblxuICAgIEBzMyA9IG5ldyBhd3MuUzMoKVxuXG4gICAgQGFyckFsbG93ZWREYXRhRXh0ZW5zaW9ucyA9IG51bGxcbiAgICBpZiBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnMgYW5kIEBfY2hlY2tBbGxvd2VkRGF0YUV4dGVuc2lvbnMgYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zXG4gICAgICBAYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zID0gYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zXG5cblxuICAjIEJyb3dzZXIgZm9ybSBwb3N0IHBhcmFtcyBmb3IgdXBsb2FkaW5nXG4gIHVwbG9hZFBvc3RGb3JtOiAob3B0aW9ucyA9IHt9LCBjYikgLT5cbiAgICB0aHJvdyBuZXcgRXJyb3IgJ0NhbGxiYWNrIGlzIHJlcXVpcmVkJyB1bmxlc3MgY2JcbiAgICB7IGV4dGVuc2lvbiwga2V5LCBidWNrZXQsIGV4cGlyZXMsIGFjbCwgY29udGVudExlbmd0aCwgYWxnb3JpdGhtLCByZWdpb24sIHMzRm9yY2VQYXRoU3R5bGUsIGNvbmRpdGlvbk1hdGNoaW5nIH0gPSBvcHRpb25zXG4gICAga2V5ID0gb3B0aW9ucy5rZXlcbiAgICBidWNrZXQgPSBvcHRpb25zLmJ1Y2tldFxuICAgIHJlZ2lvbiA9IG9wdGlvbnMucmVnaW9uXG4gICAgZXh0ZW5zaW9uID0gb3B0aW9ucy5leHRlbnNpb24gPyBudWxsXG4gICAgZXhwaXJlcyA9IG9wdGlvbnMuZXhwaXJlcyA/IG1vbWVudC51dGMoKS5hZGQoNjAsICdtaW51dGVzJykudG9EYXRlKClcbiAgICBhY2wgPSBvcHRpb25zLmFjbCA/ICdwdWJsaWMtcmVhZCdcbiAgICBjb250ZW50TGVuZ3RoID0gb3B0aW9ucy5jb250ZW50TGVuZ3RoID8gbnVsbFxuICAgIGFsZ29yaXRobSA9IG9wdGlvbnMuYWxnb3JpdGhtID8gJ0FXUzQtSE1BQy1TSEEyNTYnXG4gICAgcmVnaW9uID0gb3B0aW9ucy5yZWdpb24gPyBAcmVnaW9uXG4gICAgY29uZGl0aW9uTWF0Y2hpbmcgPSBvcHRpb25zLmNvbmRpdGlvbk1hdGNoaW5nID8gbnVsbFxuICAgIGNhY2hlQ29udHJvbCA9IG9wdGlvbnMuY2FjaGVDb250cm9sID8gbnVsbFxuICAgIGNvbnRlbnREaXNwb3NpdGlvbiA9IG9wdGlvbnMuY29udGVudERpc3Bvc2l0aW9uID8gbnVsbFxuICAgICMgQFRPRE8gb3B0aW9ucyB0eXBlIGNoZWNrXG4gICAgdW5sZXNzIGtleSBhbmQgYnVja2V0XG4gICAgICByZXR1cm4gY2IgbmV3IEVycm9yICdrZXkgYW5kIGJ1Y2tldCBhcmUgcmVxdWlyZWQnXG5cbiAgICBpZiBleHRlbnNpb25cbiAgICAgIGNvbnRlbnRUeXBlID0gQF9jaGVja0RhdGFFeHRlbnNpb24gZXh0ZW5zaW9uXG4gICAgICByZXR1cm4gY2IgbmV3IEVycm9yICdEYXRhIGV4dGVuc2lvbiBub3QgYWxsb3dlZCcgdW5sZXNzIGNvbnRlbnRUeXBlXG5cbiAgICBpZiBhbGdvcml0aG0uc3BsaXQoJy0nKS5sZW5ndGggPT0gM1xuICAgICAgYXJyQWxnb3JpdGhtID0gYWxnb3JpdGhtLnNwbGl0KCctJylcbiAgICAgIHNpZ3ZlciA9IGFyckFsZ29yaXRobVswXVxuICAgICAgaGFzaGFsZyA9IGFyckFsZ29yaXRobVsyXS50b0xvd2VyQ2FzZSgpXG4gICAgZWxzZVxuICAgICAgc2lndmVyID0gXCJBV1M0XCJcbiAgICAgIGhhc2hhbGcgPSBcInNoYTI1NlwiXG5cbiAgICBwb2xpY3lEb2MgPSB7fVxuXG4gICAgcG9saWN5RG9jW1wiZXhwaXJhdGlvblwiXSA9IG1vbWVudC51dGMoZXhwaXJlcykuZm9ybWF0KFwiWVlZWS1NTS1ERFtUXUhIOk1NOlNTW1pdXCIpIGlmIGV4cGlyZXMgYW5kIF8uaXNEYXRlIGV4cGlyZXNcbiAgICBwb2xpY3lEb2NbXCJjb25kaXRpb25zXCJdID0gW11cblxuICAgIGRhdGVTaG9ydFBvbGljeSA9IG1vbWVudC51dGMoKS5mb3JtYXQoJ1lZWVlNTUREJylcbiAgICBkYXRlTG9uZ1BvbGljeSA9IG1vbWVudC51dGMoKS5mb3JtYXQoJ1lZWVlNTUREW1RdSEhNTVNTW1pdJylcblxuICAgIHBvbGljeURvYy5jb25kaXRpb25zLnB1c2ggeyAnYnVja2V0JzogYnVja2V0IH1cbiAgICBwb2xpY3lEb2MuY29uZGl0aW9ucy5wdXNoIFsgJ3N0YXJ0cy13aXRoJywgJyRrZXknLCBrZXkgXVxuICAgIHBvbGljeURvYy5jb25kaXRpb25zLnB1c2ggeyAnYWNsJzogYWNsIH1cbiAgICBwb2xpY3lEb2MuY29uZGl0aW9ucy5wdXNoIHsgJ2NhY2hlLWNvbnRyb2wnOiBjYWNoZUNvbnRyb2wgfSBpZiBjYWNoZUNvbnRyb2xcbiAgICBwb2xpY3lEb2MuY29uZGl0aW9ucy5wdXNoIHsgJ2NvbnRlbnQtZGlzcG9zaXRpb24nOiBjb250ZW50RGlzcG9zaXRpb24gfSBpZiBjb250ZW50RGlzcG9zaXRpb25cbiAgICBwb2xpY3lEb2MuY29uZGl0aW9ucy5wdXNoIFsgJ3N0YXJ0cy13aXRoJywgJyRDb250ZW50LVR5cGUnLCAnJyBdIGlmIGNvbnRlbnRUeXBlXG4gICAgcG9saWN5RG9jLmNvbmRpdGlvbnMucHVzaCBbICdjb250ZW50LWxlbmd0aC1yYW5nZScsIDAsIGNvbnRlbnRMZW5ndGggXSBpZiBjb250ZW50TGVuZ3RoXG4gICAgcG9saWN5RG9jLmNvbmRpdGlvbnMucHVzaCB7IFwieC1hbXotYWxnb3JpdGhtXCI6IGFsZ29yaXRobSB9XG4gICAgcG9saWN5RG9jLmNvbmRpdGlvbnMucHVzaCB7IFwieC1hbXotY3JlZGVudGlhbFwiOiBcIiN7QGFjY2Vzc0tleUlkfS8je2RhdGVTaG9ydFBvbGljeX0vI3tyZWdpb259L3MzL2F3czRfcmVxdWVzdFwiIH1cbiAgICBwb2xpY3lEb2MuY29uZGl0aW9ucy5wdXNoIHsgXCJ4LWFtei1kYXRlXCI6IGRhdGVMb25nUG9saWN5fVxuXG4gICAgaWYgY29uZGl0aW9uTWF0Y2hpbmcgYW5kIF8uaXNBcnJheSBjb25kaXRpb25NYXRjaGluZ1xuICAgICAgcG9saWN5RG9jLmNvbmRpdGlvbnMgPSBfLnVuaW9uIGNvbmRpdGlvbk1hdGNoaW5nLCBwb2xpY3lEb2MuY29uZGl0aW9uc1xuXG4gICAgZGF0ZUtleSA9IGNyeXB0by5jcmVhdGVIbWFjKGhhc2hhbGcsIFwiI3tzaWd2ZXJ9I3tAc2VjcmV0QWNjZXNzS2V5fVwiKS51cGRhdGUoZGF0ZVNob3J0UG9saWN5KS5kaWdlc3QoKVxuICAgIGRhdGVSZWdpb25LZXkgPSBjcnlwdG8uY3JlYXRlSG1hYyhoYXNoYWxnLCBkYXRlS2V5KS51cGRhdGUocmVnaW9uKS5kaWdlc3QoKVxuICAgIGRhdGVSZWdpb25TZXJ2aWNlS2V5ID0gY3J5cHRvLmNyZWF0ZUhtYWMoaGFzaGFsZywgZGF0ZVJlZ2lvbktleSkudXBkYXRlKCdzMycpLmRpZ2VzdCgpXG4gICAgc2lnbmluZ0tleSA9IGNyeXB0by5jcmVhdGVIbWFjKGhhc2hhbGcsIGRhdGVSZWdpb25TZXJ2aWNlS2V5KS51cGRhdGUoXCIje3NpZ3Zlci50b0xvd2VyQ2FzZSgpfV9yZXF1ZXN0XCIpLmRpZ2VzdCgpXG4gICAgcG9saWN5ID0gbmV3IEJ1ZmZlcihKU09OLnN0cmluZ2lmeShwb2xpY3lEb2MpKS50b1N0cmluZygnYmFzZTY0JylcbiAgICBzaWduYXR1cmUgPSBjcnlwdG8uY3JlYXRlSG1hYyhoYXNoYWxnLHNpZ25pbmdLZXkpLnVwZGF0ZShwb2xpY3kpLmRpZ2VzdCgnaGV4JylcblxuICAgIHN0cmVhbSA9IHt9XG4gICAgc3RyZWFtWydwYXJhbXMnXSA9XG4gICAgICBcImtleVwiOiBrZXlcbiAgICAgIFwiYWNsXCI6IGFjbFxuICAgICAgXCJ4LWFtei1hbGdvcml0aG1cIjogYWxnb3JpdGhtXG4gICAgICBcIngtYW16LWNyZWRlbnRpYWxcIjogXCIje0BhY2Nlc3NLZXlJZH0vI3tkYXRlU2hvcnRQb2xpY3l9LyN7cmVnaW9ufS9zMy8je3NpZ3Zlci50b0xvd2VyQ2FzZSgpfV9yZXF1ZXN0XCJcbiAgICAgIFwieC1hbXotZGF0ZVwiOiBkYXRlTG9uZ1BvbGljeVxuICAgICAgXCJwb2xpY3lcIjogcG9saWN5XG4gICAgICBcIngtYW16LXNpZ25hdHVyZVwiOiBzaWduYXR1cmVcbiAgICBzdHJlYW0ucGFyYW1zWydjb250ZW50LXR5cGUnXSA9IGNvbnRlbnRUeXBlIGlmIGNvbnRlbnRUeXBlXG4gICAgc3RyZWFtLnBhcmFtc1snY2FjaGUtY29udHJvbCddID0gY2FjaGVDb250cm9sIGlmIGNhY2hlQ29udHJvbFxuICAgIHN0cmVhbS5wYXJhbXNbJ2NvbnRlbnQtZGlzcG9zaXRpb24nXSA9IGNvbnRlbnREaXNwb3NpdGlvbiBpZiBjb250ZW50RGlzcG9zaXRpb25cbiAgICBzdHJlYW1bJ2NvbmRpdGlvbnMnXSAgPSBjb25kaXRpb25NYXRjaGluZyBpZiBjb25kaXRpb25NYXRjaGluZ1xuICAgIGlmIHRoaXMuczNGb3JjZVBhdGhTdHlsZVxuICAgICAgc3RyZWFtWydwdWJsaWNfdXJsJ10gID0gXCJodHRwczovL3MzLSN7cmVnaW9ufS5hbWF6b25hd3MuY29tLyN7YnVja2V0fS8je2tleX1cIlxuICAgICAgc3RyZWFtWydmb3JtX3VybCddICAgID0gXCJodHRwczovL3MzLSN7cmVnaW9ufS5hbWF6b25hd3MuY29tLyN7YnVja2V0fS9cIlxuICAgIGVsc2VcbiAgICAgIHN0cmVhbVsncHVibGljX3VybCddICA9IFwiaHR0cHM6Ly8je2J1Y2tldH0uczMuYW1hem9uYXdzLmNvbS8je2tleX1cIlxuICAgICAgc3RyZWFtWydmb3JtX3VybCddICAgID0gXCJodHRwczovLyN7YnVja2V0fS5zMy5hbWF6b25hd3MuY29tL1wiXG4gICAgY2IgbnVsbCwgc3RyZWFtXG5cblxuICAjIFMzLnVwbG9hZFxuICB1cGxvYWQ6IChvcHRpb25zID0ge30sIGNiKSAtPlxuICAgIHRocm93IG5ldyBFcnJvciAnQ2FsbGJhY2sgaXMgcmVxdWlyZWQnIHVubGVzcyBjYlxuICAgIHsgZGF0YSwgZXh0ZW5zaW9uLCBrZXksIGJ1Y2tldCwgZXhwaXJlcywgYWNsLCBjb250ZW50TGVuZ3RoIH0gPSBvcHRpb25zXG4gICAgZGF0YSA9IG9wdGlvbnMuZGF0YVxuICAgIGtleSA9IG9wdGlvbnMua2V5XG4gICAgYnVja2V0ID0gb3B0aW9ucy5idWNrZXRcbiAgICBleHRlbnNpb24gPSBvcHRpb25zLmV4dGVuc2lvbiA/IG51bGxcbiAgICBleHBpcmVzID0gb3B0aW9ucy5leHBpcmVzID8gbnVsbFxuICAgIGFjbCA9IG9wdGlvbnMuYWNsID8gbnVsbFxuICAgIGNvbnRlbnRMZW5ndGggPSBvcHRpb25zLmNvbnRlbnRMZW5ndGggPyBudWxsXG4gICAgY29udGVudERpc3Bvc2l0aW9uID0gb3B0aW9ucy5jb250ZW50RGlzcG9zaXRpb24gPyBudWxsXG4gICAgXG4gICAgIyBAVE9ETyBvcHRpb25zIHR5cGUgY2hlY2tcbiAgICB1bmxlc3MgZGF0YSBhbmQga2V5IGFuZCBidWNrZXRcbiAgICAgIHJldHVybiBjYiBuZXcgRXJyb3IgJ2RhdGEsIGtleSBhbmQgYnVja2V0IGFyZSByZXF1aXJlZCdcblxuICAgIHBhcmFtcyA9XG4gICAgICBCdWNrZXQ6IGJ1Y2tldFxuICAgICAgS2V5OiBrZXlcbiAgICAgIEJvZHk6IGRhdGFcblxuICAgIGlmIGV4dGVuc2lvblxuICAgICAgY29udGVudFR5cGUgPSBAX2NoZWNrRGF0YUV4dGVuc2lvbiBleHRlbnNpb25cbiAgICAgIHJldHVybiBjYiBuZXcgRXJyb3IgJ0RhdGEgZXh0ZW5zaW9uIG5vdCBhbGxvd2VkJyB1bmxlc3MgY29udGVudFR5cGVcbiAgICAgIHBhcmFtc1tcIkNvbnRlbnRUeXBlXCJdID0gY29udGVudFR5cGVcblxuICAgIHBhcmFtc1tcIkNhY2hlLUNvbnRyb2xcIl0gPSBjYWNoZUNvbnRyb2wgaWYgY2FjaGVDb250cm9sXG4gICAgcGFyYW1zW1wiQ29udGVudC1EaXNwb3NpdGlvblwiXSA9IGNvbnRlbnREaXNwb3NpdGlvbiBpZiBjb250ZW50RGlzcG9zaXRpb25cbiAgICBwYXJhbXNbXCJFeHBpcmVzXCJdID0gbW9tZW50LnV0YyhleHBpcmVzKSBpZiBleHBpcmVzIGFuZCBfLmlzRGF0ZSBleHBpcmVzXG4gICAgcGFyYW1zW1wiQUNMXCJdID0gYWNsIGlmIGFjbFxuICAgIHBhcmFtc1tcIkNvbnRlbnRMZW5ndGhcIl0gPSBjb250ZW50TGVuZ3RoIGlmIGNvbnRlbnRMZW5ndGhcblxuICAgIEBzMy51cGxvYWQgcGFyYW1zLCAoZXJyLCBkYXRhKSAtPlxuICAgICAgcmV0dXJuIGNiIGVyciBpZiBlcnJcbiAgICAgIGNiIG51bGwsIFwiaHR0cHM6Ly8je2J1Y2tldH0uczMuYW1hem9uYXdzLmNvbS8je2tleX1cIlxuXG5cbiAgIyBTMy5wdXRPYmplY3RcbiAgcHV0OiAob3B0aW9ucyA9IHt9LCBjYikgLT5cbiAgICB0aHJvdyBuZXcgRXJyb3IgJ0NhbGxiYWNrIGlzIHJlcXVpcmVkJyB1bmxlc3MgY2JcbiAgICB7IGV4dGVuc2lvbiwga2V5LCBidWNrZXQsIGV4cGlyZXMsIGFjbCwgY29udGVudExlbmd0aCB9ID0gb3B0aW9uc1xuICAgIGtleSA9IG9wdGlvbnMua2V5XG4gICAgYnVja2V0ID0gb3B0aW9ucy5idWNrZXRcbiAgICBleHRlbnNpb24gPSBvcHRpb25zLmV4dGVuc2lvbiA/IG51bGxcbiAgICBleHBpcmVzID0gb3B0aW9ucy5leHBpcmVzID8gbnVsbFxuICAgIGFjbCA9IG9wdGlvbnMuYWNsID8gbnVsbFxuXG4gICAgIyBAVE9ETyBvcHRpb25zIHR5cGUgY2hlY2tcbiAgICB1bmxlc3Mga2V5IGFuZCBidWNrZXRcbiAgICAgIHJldHVybiBjYiBuZXcgRXJyb3IgJ2tleSBhbmQgYnVja2V0IGFyZSByZXF1aXJlZCdcblxuICAgIHBhcmFtcyA9XG4gICAgICBCdWNrZXQ6IGJ1Y2tldFxuICAgICAgS2V5OiBrZXlcblxuICAgIGlmIGV4dGVuc2lvblxuICAgICAgY29udGVudFR5cGUgPSBAX2NoZWNrRGF0YUV4dGVuc2lvbiBleHRlbnNpb25cbiAgICAgIHJldHVybiBjYiBuZXcgRXJyb3IgJ0RhdGEgZXh0ZW5zaW9uIG5vdCBhbGxvd2VkJyB1bmxlc3MgY29udGVudFR5cGVcbiAgICAgIHBhcmFtc1tcIkNvbnRlbnRUeXBlXCJdID0gY29udGVudFR5cGVcblxuICAgIHBhcmFtc1tcIkNhY2hlLUNvbnRyb2xcIl0gPSBcIm1heC1hZ2U9MzE1MzYwMDAsIGltbXV0YWJsZVwiXG4gICAgcGFyYW1zW1wiRXhwaXJlc1wiXSA9IG1vbWVudC51dGMoZXhwaXJlcykgaWYgZXhwaXJlcyBhbmQgXy5pc0RhdGUgZXhwaXJlc1xuICAgIHBhcmFtc1tcIkFDTFwiXSA9IGFjbCBpZiBhY2xcblxuICAgIEBzMy5nZXRTaWduZWRVcmwgXCJwdXRPYmplY3RcIiwgcGFyYW1zLCAoZXJyLCBkYXRhKSAtPlxuICAgICAgcmV0dXJuIGNiIGVyciBpZiBlcnJcblxuICAgICAgcHV0ID1cbiAgICAgICAgJ3NpZ25lZF91cmwnOiBkYXRhXG4gICAgICAgICdwdWJsaWNfdXJsJzogXCJodHRwczovLyN7YnVja2V0fS5zMy5hbWF6b25hd3MuY29tLyN7a2V5fVwiXG5cbiAgICAgIGNiIG51bGwsIHB1dFxuXG5cbiAgIyBDaGVjayBkYXRhIHR5cGUgZnJvbSBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnNcbiAgX2NoZWNrRGF0YUV4dGVuc2lvbjogKGRhdGFFeHRlbnNpb24pIC0+XG4gICAgcmV0dXJuIGZhbHNlIGlmIG5vdCBkYXRhRXh0ZW5zaW9uIG9yIChAYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zIGFuZCBkYXRhRXh0ZW5zaW9uIG5vdCBpbiBAYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zKVxuICAgIHJldHVybiBtaW1lLmxvb2t1cCBkYXRhRXh0ZW5zaW9uXG5cblxuICAjIENoZWNrIGFsbG93ZWQgZGF0YSB0eXBlc1xuICBfY2hlY2tBbGxvd2VkRGF0YUV4dGVuc2lvbnM6IChhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnMpIC0+XG4gICAgcmV0dXJuIGZhbHNlIHVubGVzcyBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnNcblxuICAgIHVubGVzcyBfLmlzQXJyYXkgYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgXCJBbGxvd2VkIGRhdGEgZXh0ZW5zaW9ucyBtdXN0IGJlIGFycmF5IG9mIHN0cmluZ3NcIlxuXG4gICAgZm9yIGV4dCBvZiBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnNcbiAgICAgIHVubGVzcyBfLmlzU3RyaW5nIGV4dFxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IgXCJFeHRlbnNpb25zIG11c3QgYmUgYSBzdHJpbmdzXCJcblxuICAgIHJldHVybiB0cnVlXG5cblxuICAjIENoZWNrIG9wdGlvbnMgcGFyYW1zXG4gIF9jaGVja09wdGlvbnM6IChvcHRpb25zID0ge30pIC0+XG4gICAge1xuICAgICAgQGFjY2Vzc0tleUlkLCBAc2VjcmV0QWNjZXNzS2V5LCBAcmVnaW9uLCBAc2lnbmF0dXJlVmVyc2lvbiwgQG1heFJldHJpZXMsIEBtYXhSZWRpcmVjdHMsIEBzeXN0ZW1DbG9ja09mZnNldCxcbiAgICAgIEBzc2xFbmFibGVkLCBAcGFyYW1WYWxpZGF0aW9uLCBAY29tcHV0ZUNoZWNrc3VtcywgQGNvbnZlcnRSZXNwb25zZVR5cGVzLCBAczNGb3JjZVBhdGhTdHlsZSwgQHMzQnVja2V0RW5kcG9pbnQsXG4gICAgICBAYXBpVmVyc2lvbiwgQGh0dHBPcHRpb25zLCBAYXBpVmVyc2lvbnMsIEBzZXNzaW9uVG9rZW4sIEBjcmVkZW50aWFscywgQGNyZWRlbnRpYWxQcm92aWRlciwgQGxvZ2dlclxuICAgIH0gPSBvcHRpb25zXG5cbiAgICB1bmxlc3MgQGFjY2Vzc0tleUlkXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgXCJhY2Nlc3NLZXlJZCBpcyByZXF1aXJlZFwiXG5cbiAgICB1bmxlc3MgQHNlY3JldEFjY2Vzc0tleVxuICAgICAgdGhyb3cgbmV3IEVycm9yIFwic2VjcmV0QWNjZXNzS2V5IGlzIHJlcXVpcmVkXCJcblxuICAgIHVubGVzcyBAcmVnaW9uXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgXCJyZWdpb24gaXMgcmVxdWlyZWRcIlxuXG4gICAgdW5sZXNzIF8uaXNTdHJpbmcgQGFjY2Vzc0tleUlkXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgXCJhY2Nlc3NLZXlJZCBtdXN0IGJlIGEgc3RyaW5nXCJcblxuICAgIHVubGVzcyBfLmlzU3RyaW5nIEBzZWNyZXRBY2Nlc3NLZXlcbiAgICAgIHRocm93IG5ldyBFcnJvciBcInNlY3JldEFjY2Vzc0tleSBtdXN0IGJlIGEgc3RyaW5nXCJcblxuICAgIHVubGVzcyBfLmlzU3RyaW5nIEByZWdpb25cbiAgICAgIHRocm93IG5ldyBFcnJvciBcInJlZ2lvbiBtdXN0IGJlIGEgc3RyaW5nXCJcblxuICAgIGlmIEBzaWduYXR1cmVWZXJzaW9uIGFuZCBub3QgXy5pc1N0cmluZyBAc2lnbmF0dXJlVmVyc2lvblxuICAgICAgdGhyb3cgbmV3IEVycm9yIFwic2lnbmF0dXJlVmVyc2lvbiBtdXN0IGJlIGEgc3RyaW5nXCJcblxuICAgIGlmIEBtYXhSZXRyaWVzIGFuZCBub3QgXy5pc0ludGVnZXIgQG1heFJldHJpZXNcbiAgICAgIHRocm93IG5ldyBFcnJvciAnbWF4UmV0cmllcyBtdXN0IGJlIGEgaW50ZWdlcidcblxuICAgIGlmIEBtYXhSZWRpcmVjdHMgYW5kIG5vdCBfLmlzSW50ZWdlciBAbWF4UmVkaXJlY3RzXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ21heFJlZGlyZWN0cyBtdXN0IGJlIGEgaW50ZWdlcidcblxuICAgIGlmIEBzeXN0ZW1DbG9ja09mZnNldCBhbmQgbm90IF8uaXNOdW1iZXIgQHN5c3RlbUNsb2NrT2Zmc2V0XG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ3N5c3RlbUNsb2NrT2Zmc2V0IG11c3QgYmUgYSBudW1iZXInXG5cbiAgICBpZiBAc3NsRW5hYmxlZCBhbmQgbm90IF8uaXNCb29sZWFuIEBzc2xFbmFibGVkXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ3NzbEVuYWJsZWQgbXVzdCBiZSBhIGJvb2xlYW4nXG5cbiAgICBpZiBAcGFyYW1WYWxpZGF0aW9uIGFuZCBub3QgXy5pc0Jvb2xlYW4gQHBhcmFtVmFsaWRhdGlvblxuICAgICAgdGhyb3cgbmV3IEVycm9yICdwYXJhbVZhbGlkYXRpb24gbXVzdCBiZSBhIGJvb2xlYW4nXG5cbiAgICBpZiBAY29tcHV0ZUNoZWNrc3VtcyBhbmQgbm90IF8uaXNCb29sZWFuIEBjb21wdXRlQ2hlY2tzdW1zXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ2NvbXB1dGVDaGVja3N1bXMgbXVzdCBiZSBhIGJvb2xlYW4nXG5cbiAgICBpZiBAY29udmVydFJlc3BvbnNlVHlwZXMgYW5kIG5vdCBfLmlzQm9vbGVhbiBAY29udmVydFJlc3BvbnNlVHlwZXNcbiAgICAgIHRocm93IG5ldyBFcnJvciAnY29udmVydFJlc3BvbnNlVHlwZXMgbXVzdCBiZSBhIGJvb2xlYW4nXG5cbiAgICBpZiBAczNGb3JjZVBhdGhTdHlsZSBhbmQgbm90IF8uaXNCb29sZWFuIEBzM0ZvcmNlUGF0aFN0eWxlXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ3MzRm9yY2VQYXRoU3R5bGUgbXVzdCBiZSBhIGJvb2xlYW4nXG5cbiAgICBpZiBAczNCdWNrZXRFbmRwb2ludCBhbmQgbm90IF8uaXNCb29sZWFuIEBzM0J1Y2tldEVuZHBvaW50XG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ3MzQnVja2V0RW5kcG9pbnQgbXVzdCBiZSBhIGJvb2xlYW4nXG5cbiAgICBpZiBAaHR0cE9wdGlvbnMgYW5kIG5vdCBfLmlzUGxhaW5PYmplY3QgQGh0dHBPcHRpb25zXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ2h0dHBPcHRpb25zIG11c3QgYmUgYSBkaWN0IHdpdGggcGFyYW1zOiBwcm94eSwgYWdlbnQsIHRpbWVvdXQsIHhockFzeW5jLCB4aHJXaXRoQ3JlZGVudGlhbHMnXG5cbiAgICBpZiBAYXBpVmVyc2lvbnMgYW5kIG5vdCBfLmlzUGxhaW5PYmplY3QgQGFwaVZlcnNpb25zXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ2FwaVZlcnNpb25zIG11c3QgYmUgYSBkaWN0IHdpdGggdmVyc2lvbnMnXG5cbiAgICBpZiBAYXBpVmVyc2lvbiBhbmQgbm90IChfLmlzU3RyaW5nIEBhcGlWZXJzaW9uIG9yIF8uaXNEYXRlIEBhcGlWZXJzaW9uKVxuICAgICAgdGhyb3cgbmV3IEVycm9yICdhcGlWZXJzaW9uIG11c3QgYmUgYSBzdHJpbmcgb3IgZGF0ZSdcblxuICAgIGlmIEBzZXNzaW9uVG9rZW4gYW5kIG5vdCBAc2Vzc2lvblRva2VuIGluc3RhbmNlb2YgYXdzLkNyZWRlbnRpYWxzXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ3Nlc3Npb25Ub2tlbiBtdXN0IGJlIGEgQVdTLkNyZWRlbnRpYWxzJ1xuXG4gICAgaWYgQGNyZWRlbnRpYWxzIGFuZCBub3QgQGNyZWRlbnRpYWxzIGluc3RhbmNlb2YgYXdzLkNyZWRlbnRpYWxzXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ2NyZWRlbnRpYWxzIG11c3QgYmUgYSBBV1MuQ3JlZGVudGlhbHMnXG5cbiAgICBpZiBAY3JlZGVudGlhbFByb3ZpZGVyIGFuZCBub3QgQGNyZWRlbnRpYWxQcm92aWRlciBpbnN0YW5jZW9mIGF3cy5DcmVkZW50aWFsc1Byb3ZpZGVyQ2hhaW5cbiAgICAgIHRocm93IG5ldyBFcnJvciAnY3JlZGVudGlhbFByb3ZpZGVyIG11c3QgYmUgYSBBV1MuQ3JlZGVudGlhbHNQcm92aWRlckNoYWluJ1xuXG4gICAgaWYgQGxvZ2dlciBhbmQgbm90IChAbG9nZ2VyLndyaXRlIGFuZCBAbG9nZ2VyLmxvZylcbiAgICAgIHRocm93IG5ldyBFcnJvciAnbG9nZ2VyIG11c3QgaGF2ZSAjd3JpdGUgb3IgI2xvZyBtZXRob2RzJ1xuXG5cbiMgRXhwb3J0c1xubW9kdWxlLmV4cG9ydHMgPSBTM0NsaWVudFxuXG4iXX0=
