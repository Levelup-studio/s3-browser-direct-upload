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
      "x-amz-signature": signature,
      "Cache-Control": "max-age=31536000, immutable",
      "x-amz-meta-Cache-Control": "max-age=31536000, immutable"
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGliL2luZGV4LmpzIiwic291cmNlcyI6WyJsaWIvaW5kZXguY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLElBQUEsaUNBQUE7RUFBQTs7QUFBQSxDQUFBLEdBQVUsT0FBQSxDQUFRLFFBQVI7O0FBQ1YsSUFBQSxHQUFVLE9BQUEsQ0FBUSxNQUFSOztBQUNWLE1BQUEsR0FBVSxPQUFBLENBQVEsUUFBUjs7QUFDVixNQUFBLEdBQVUsT0FBQSxDQUFRLFFBQVI7O0FBR0o7RUFDUyxrQkFBQyxPQUFELEVBQWUsd0JBQWY7QUFDWCxRQUFBOztNQURZLFVBQVU7O0lBQ3RCLEdBQUEsR0FBTSxPQUFBLENBQVEsU0FBUjtJQUVOLElBQUEsQ0FBQSxDQUE4QixPQUFBLFlBQW1CLEdBQUcsQ0FBQyxNQUFyRCxDQUFBO01BQUEsSUFBQyxDQUFBLGFBQUQsQ0FBZSxPQUFmLEVBQUE7O0lBQ0EsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFYLENBQWtCLE9BQWxCO0lBRUEsSUFBQyxDQUFBLEVBQUQsR0FBVSxJQUFBLEdBQUcsQ0FBQyxFQUFKLENBQUE7SUFFVixJQUFDLENBQUEsd0JBQUQsR0FBNEI7SUFDNUIsSUFBRyx3QkFBQSxJQUE2QixJQUFDLENBQUEsMkJBQUQsQ0FBNkIsd0JBQTdCLENBQWhDO01BQ0UsSUFBQyxDQUFBLHdCQUFELEdBQTRCLHlCQUQ5Qjs7RUFUVzs7cUJBY2IsY0FBQSxHQUFnQixTQUFDLE9BQUQsRUFBZSxFQUFmO0FBQ2QsUUFBQTs7TUFEZSxVQUFVOztJQUN6QixJQUFBLENBQThDLEVBQTlDO0FBQUEsWUFBVSxJQUFBLEtBQUEsQ0FBTSxzQkFBTixFQUFWOztJQUNFLDZCQUFGLEVBQWEsaUJBQWIsRUFBa0IsdUJBQWxCLEVBQTBCLHlCQUExQixFQUFtQyxpQkFBbkMsRUFBd0MscUNBQXhDLEVBQXVELDZCQUF2RCxFQUFrRSx1QkFBbEUsRUFBMEUsMkNBQTFFLEVBQTRGO0lBQzVGLEdBQUEsR0FBTSxPQUFPLENBQUM7SUFDZCxNQUFB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LENBQUksSUFBQyxDQUFBLGtCQUFMLFlBQW1DLEdBQUcsQ0FBQyx3QkFBbEU7QUFDRSxZQUFVLElBQUEsS0FBQSxDQUFNLDJEQUFOLEVBRFo7O0lBR0EsSUFBRyxJQUFDLENBQUEsTUFBRCxJQUFZLENBQUksQ0FBQyxJQUFDLENBQUEsTUFBTSxDQUFDLEtBQVIsSUFBa0IsSUFBQyxDQUFBLE1BQU0sQ0FBQyxHQUEzQixDQUFuQjtBQUNFLFlBQVUsSUFBQSxLQUFBLENBQU0seUNBQU4sRUFEWjs7RUF6RWE7Ozs7OztBQThFakIsTUFBTSxDQUFDLE9BQVAsR0FBaUIiLCJzb3VyY2VzQ29udGVudCI6WyIjIHMzLWJyb3dzZXItZGlyZWN0LXVwbG9hZFxuXyAgICAgICA9IHJlcXVpcmUoJ2xvZGFzaCcpXG5taW1lICAgID0gcmVxdWlyZSgnbWltZScpXG5tb21lbnQgID0gcmVxdWlyZSgnbW9tZW50JylcbmNyeXB0byAgPSByZXF1aXJlKCdjcnlwdG8nKVxuXG5cbmNsYXNzIFMzQ2xpZW50XG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucyA9IHt9LCBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnMpIC0+XG4gICAgYXdzID0gcmVxdWlyZSgnYXdzLXNkaycpXG5cbiAgICBAX2NoZWNrT3B0aW9ucyBvcHRpb25zIHVubGVzcyBvcHRpb25zIGluc3RhbmNlb2YgYXdzLkNvbmZpZ1xuICAgIGF3cy5jb25maWcudXBkYXRlIG9wdGlvbnNcblxuICAgIEBzMyA9IG5ldyBhd3MuUzMoKVxuXG4gICAgQGFyckFsbG93ZWREYXRhRXh0ZW5zaW9ucyA9IG51bGxcbiAgICBpZiBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnMgYW5kIEBfY2hlY2tBbGxvd2VkRGF0YUV4dGVuc2lvbnMgYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zXG4gICAgICBAYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zID0gYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zXG5cblxuICAjIEJyb3dzZXIgZm9ybSBwb3N0IHBhcmFtcyBmb3IgdXBsb2FkaW5nXG4gIHVwbG9hZFBvc3RGb3JtOiAob3B0aW9ucyA9IHt9LCBjYikgLT5cbiAgICB0aHJvdyBuZXcgRXJyb3IgJ0NhbGxiYWNrIGlzIHJlcXVpcmVkJyB1bmxlc3MgY2JcbiAgICB7IGV4dGVuc2lvbiwga2V5LCBidWNrZXQsIGV4cGlyZXMsIGFjbCwgY29udGVudExlbmd0aCwgYWxnb3JpdGhtLCByZWdpb24sIHMzRm9yY2VQYXRoU3R5bGUsIGNvbmRpdGlvbk1hdGNoaW5nIH0gPSBvcHRpb25zXG4gICAga2V5ID0gb3B0aW9ucy5rZXlcbiAgICBidWNrZXQgPSBvcHRpb25zLmJ1Y2tldFxuICAgIHJlZ2lvbiA9IG9wdGlvbnMucmVnaW9uXG4gICAgZXh0ZW5zaW9uID0gb3B0aW9ucy5leHRlbnNpb24gPyBudWxsXG4gICAgZXhwaXJlcyA9IG9wdGlvbnMuZXhwaXJlcyA/IG1vbWVudC51dGMoKS5hZGQoNjAsICdtaW51dGVzJykudG9EYXRlKClcbiAgICBhY2wgPSBvcHRpb25zLmFjbCA/ICdwdWJsaWMtcmVhZCdcbiAgICBjb250ZW50TGVuZ3RoID0gb3B0aW9ucy5jb250ZW50TGVuZ3RoID8gbnVsbFxuICAgIGFsZ29yaXRobSA9IG9wdGlvbnMuYWxnb3JpdGhtID8gJ0FXUzQtSE1BQy1TSEEyNTYnXG4gICAgcmVnaW9uID0gb3B0aW9ucy5yZWdpb24gPyBAcmVnaW9uXG4gICAgY29uZGl0aW9uTWF0Y2hpbmcgPSBvcHRpb25zLmNvbmRpdGlvbk1hdGNoaW5nID8gbnVsbFxuXG4gICAgIyBAVE9ETyBvcHRpb25zIHR5cGUgY2hlY2tcbiAgICB1bmxlc3Mga2V5IGFuZCBidWNrZXRcbiAgICAgIHJldHVybiBjYiBuZXcgRXJyb3IgJ2tleSBhbmQgYnVja2V0IGFyZSByZXF1aXJlZCdcblxuICAgIGlmIGV4dGVuc2lvblxuICAgICAgY29udGVudFR5cGUgPSBAX2NoZWNrRGF0YUV4dGVuc2lvbiBleHRlbnNpb25cbiAgICAgIHJldHVybiBjYiBuZXcgRXJyb3IgJ0RhdGEgZXh0ZW5zaW9uIG5vdCBhbGxvd2VkJyB1bmxlc3MgY29udGVudFR5cGVcblxuICAgIGlmIGFsZ29yaXRobS5zcGxpdCgnLScpLmxlbmd0aCA9PSAzXG4gICAgICBhcnJBbGdvcml0aG0gPSBhbGdvcml0aG0uc3BsaXQoJy0nKVxuICAgICAgc2lndmVyID0gYXJyQWxnb3JpdGhtWzBdXG4gICAgICBoYXNoYWxnID0gYXJyQWxnb3JpdGhtWzJdLnRvTG93ZXJDYXNlKClcbiAgICBlbHNlXG4gICAgICBzaWd2ZXIgPSBcIkFXUzRcIlxuICAgICAgaGFzaGFsZyA9IFwic2hhMjU2XCJcblxuICAgIHBvbGljeURvYyA9IHt9XG5cbiAgICBwb2xpY3lEb2NbXCJleHBpcmF0aW9uXCJdID0gbW9tZW50LnV0YyhleHBpcmVzKS5mb3JtYXQoXCJZWVlZLU1NLUREW1RdSEg6TU06U1NbWl1cIikgaWYgZXhwaXJlcyBhbmQgXy5pc0RhdGUgZXhwaXJlc1xuICAgIHBvbGljeURvY1tcImNvbmRpdGlvbnNcIl0gPSBbXVxuXG4gICAgZGF0ZVNob3J0UG9saWN5ID0gbW9tZW50LnV0YygpLmZvcm1hdCgnWVlZWU1NREQnKVxuICAgIGRhdGVMb25nUG9saWN5ID0gbW9tZW50LnV0YygpLmZvcm1hdCgnWVlZWU1NRERbVF1ISE1NU1NbWl0nKVxuXG4gICAgcG9saWN5RG9jLmNvbmRpdGlvbnMucHVzaCB7ICdidWNrZXQnOiBidWNrZXQgfVxuICAgIHBvbGljeURvYy5jb25kaXRpb25zLnB1c2ggWyAnc3RhcnRzLXdpdGgnLCAnJGtleScsIGtleSBdXG4gICAgcG9saWN5RG9jLmNvbmRpdGlvbnMucHVzaCB7ICdhY2wnOiBhY2wgfVxuICAgIHBvbGljeURvYy5jb25kaXRpb25zLnB1c2ggWyAnc3RhcnRzLXdpdGgnLCAnJENvbnRlbnQtVHlwZScsICcnIF0gaWYgY29udGVudFR5cGVcbiAgICBwb2xpY3lEb2MuY29uZGl0aW9ucy5wdXNoIFsgJ2NvbnRlbnQtbGVuZ3RoLXJhbmdlJywgMCwgY29udGVudExlbmd0aCBdIGlmIGNvbnRlbnRMZW5ndGhcbiAgICBwb2xpY3lEb2MuY29uZGl0aW9ucy5wdXNoIHsgXCJ4LWFtei1hbGdvcml0aG1cIjogYWxnb3JpdGhtIH1cbiAgICBwb2xpY3lEb2MuY29uZGl0aW9ucy5wdXNoIHsgXCJ4LWFtei1jcmVkZW50aWFsXCI6IFwiI3tAYWNjZXNzS2V5SWR9LyN7ZGF0ZVNob3J0UG9saWN5fS8je3JlZ2lvbn0vczMvYXdzNF9yZXF1ZXN0XCIgfVxuICAgIHBvbGljeURvYy5jb25kaXRpb25zLnB1c2ggeyBcIngtYW16LWRhdGVcIjogZGF0ZUxvbmdQb2xpY3l9XG5cbiAgICBpZiBjb25kaXRpb25NYXRjaGluZyBhbmQgXy5pc0FycmF5IGNvbmRpdGlvbk1hdGNoaW5nXG4gICAgICBwb2xpY3lEb2MuY29uZGl0aW9ucyA9IF8udW5pb24gY29uZGl0aW9uTWF0Y2hpbmcsIHBvbGljeURvYy5jb25kaXRpb25zXG5cbiAgICBkYXRlS2V5ID0gY3J5cHRvLmNyZWF0ZUhtYWMoaGFzaGFsZywgXCIje3NpZ3Zlcn0je0BzZWNyZXRBY2Nlc3NLZXl9XCIpLnVwZGF0ZShkYXRlU2hvcnRQb2xpY3kpLmRpZ2VzdCgpXG4gICAgZGF0ZVJlZ2lvbktleSA9IGNyeXB0by5jcmVhdGVIbWFjKGhhc2hhbGcsIGRhdGVLZXkpLnVwZGF0ZShyZWdpb24pLmRpZ2VzdCgpXG4gICAgZGF0ZVJlZ2lvblNlcnZpY2VLZXkgPSBjcnlwdG8uY3JlYXRlSG1hYyhoYXNoYWxnLCBkYXRlUmVnaW9uS2V5KS51cGRhdGUoJ3MzJykuZGlnZXN0KClcbiAgICBzaWduaW5nS2V5ID0gY3J5cHRvLmNyZWF0ZUhtYWMoaGFzaGFsZywgZGF0ZVJlZ2lvblNlcnZpY2VLZXkpLnVwZGF0ZShcIiN7c2lndmVyLnRvTG93ZXJDYXNlKCl9X3JlcXVlc3RcIikuZGlnZXN0KClcbiAgICBwb2xpY3kgPSBuZXcgQnVmZmVyKEpTT04uc3RyaW5naWZ5KHBvbGljeURvYykpLnRvU3RyaW5nKCdiYXNlNjQnKVxuICAgIHNpZ25hdHVyZSA9IGNyeXB0by5jcmVhdGVIbWFjKGhhc2hhbGcsc2lnbmluZ0tleSkudXBkYXRlKHBvbGljeSkuZGlnZXN0KCdoZXgnKVxuXG4gICAgc3RyZWFtID0ge31cbiAgICBzdHJlYW1bJ3BhcmFtcyddID1cbiAgICAgIFwia2V5XCI6IGtleVxuICAgICAgXCJhY2xcIjogYWNsXG4gICAgICBcIngtYW16LWFsZ29yaXRobVwiOiBhbGdvcml0aG1cbiAgICAgIFwieC1hbXotY3JlZGVudGlhbFwiOiBcIiN7QGFjY2Vzc0tleUlkfS8je2RhdGVTaG9ydFBvbGljeX0vI3tyZWdpb259L3MzLyN7c2lndmVyLnRvTG93ZXJDYXNlKCl9X3JlcXVlc3RcIlxuICAgICAgXCJ4LWFtei1kYXRlXCI6IGRhdGVMb25nUG9saWN5XG4gICAgICBcInBvbGljeVwiOiBwb2xpY3lcbiAgICAgIFwieC1hbXotc2lnbmF0dXJlXCI6IHNpZ25hdHVyZVxuICAgICAgXCJDYWNoZS1Db250cm9sXCI6IFwibWF4LWFnZT0zMTUzNjAwMCwgaW1tdXRhYmxlXCJcbiAgICAgIFwieC1hbXotbWV0YS1DYWNoZS1Db250cm9sXCI6IFwibWF4LWFnZT0zMTUzNjAwMCwgaW1tdXRhYmxlXCJcbiAgICBzdHJlYW0ucGFyYW1zWydjb250ZW50LXR5cGUnXSA9IGNvbnRlbnRUeXBlIGlmIGNvbnRlbnRUeXBlXG4gICAgc3RyZWFtWydjb25kaXRpb25zJ10gID0gY29uZGl0aW9uTWF0Y2hpbmcgaWYgY29uZGl0aW9uTWF0Y2hpbmdcbiAgICBpZiB0aGlzLnMzRm9yY2VQYXRoU3R5bGVcbiAgICAgIHN0cmVhbVsncHVibGljX3VybCddICA9IFwiaHR0cHM6Ly9zMy0je3JlZ2lvbn0uYW1hem9uYXdzLmNvbS8je2J1Y2tldH0vI3trZXl9XCJcbiAgICAgIHN0cmVhbVsnZm9ybV91cmwnXSAgICA9IFwiaHR0cHM6Ly9zMy0je3JlZ2lvbn0uYW1hem9uYXdzLmNvbS8je2J1Y2tldH0vXCJcbiAgICBlbHNlXG4gICAgICBzdHJlYW1bJ3B1YmxpY191cmwnXSAgPSBcImh0dHBzOi8vI3tidWNrZXR9LnMzLmFtYXpvbmF3cy5jb20vI3trZXl9XCJcbiAgICAgIHN0cmVhbVsnZm9ybV91cmwnXSAgICA9IFwiaHR0cHM6Ly8je2J1Y2tldH0uczMuYW1hem9uYXdzLmNvbS9cIlxuICAgIGNiIG51bGwsIHN0cmVhbVxuXG5cbiAgIyBTMy51cGxvYWRcbiAgdXBsb2FkOiAob3B0aW9ucyA9IHt9LCBjYikgLT5cbiAgICB0aHJvdyBuZXcgRXJyb3IgJ0NhbGxiYWNrIGlzIHJlcXVpcmVkJyB1bmxlc3MgY2JcbiAgICB7IGRhdGEsIGV4dGVuc2lvbiwga2V5LCBidWNrZXQsIGV4cGlyZXMsIGFjbCwgY29udGVudExlbmd0aCB9ID0gb3B0aW9uc1xuICAgIGRhdGEgPSBvcHRpb25zLmRhdGFcbiAgICBrZXkgPSBvcHRpb25zLmtleVxuICAgIGJ1Y2tldCA9IG9wdGlvbnMuYnVja2V0XG4gICAgZXh0ZW5zaW9uID0gb3B0aW9ucy5leHRlbnNpb24gPyBudWxsXG4gICAgZXhwaXJlcyA9IG9wdGlvbnMuZXhwaXJlcyA/IG51bGxcbiAgICBhY2wgPSBvcHRpb25zLmFjbCA/IG51bGxcbiAgICBjb250ZW50TGVuZ3RoID0gb3B0aW9ucy5jb250ZW50TGVuZ3RoID8gbnVsbFxuICAgIFxuICAgICMgQFRPRE8gb3B0aW9ucyB0eXBlIGNoZWNrXG4gICAgdW5sZXNzIGRhdGEgYW5kIGtleSBhbmQgYnVja2V0XG4gICAgICByZXR1cm4gY2IgbmV3IEVycm9yICdkYXRhLCBrZXkgYW5kIGJ1Y2tldCBhcmUgcmVxdWlyZWQnXG5cbiAgICBwYXJhbXMgPVxuICAgICAgQnVja2V0OiBidWNrZXRcbiAgICAgIEtleToga2V5XG4gICAgICBCb2R5OiBkYXRhXG5cbiAgICBpZiBleHRlbnNpb25cbiAgICAgIGNvbnRlbnRUeXBlID0gQF9jaGVja0RhdGFFeHRlbnNpb24gZXh0ZW5zaW9uXG4gICAgICByZXR1cm4gY2IgbmV3IEVycm9yICdEYXRhIGV4dGVuc2lvbiBub3QgYWxsb3dlZCcgdW5sZXNzIGNvbnRlbnRUeXBlXG4gICAgICBwYXJhbXNbXCJDb250ZW50VHlwZVwiXSA9IGNvbnRlbnRUeXBlXG5cbiAgICBwYXJhbXNbXCJDYWNoZS1Db250cm9sXCJdID0gXCJtYXgtYWdlPTMxNTM2MDAwLCBpbW11dGFibGVcIlxuICAgIHBhcmFtc1tcIkV4cGlyZXNcIl0gPSBtb21lbnQudXRjKGV4cGlyZXMpIGlmIGV4cGlyZXMgYW5kIF8uaXNEYXRlIGV4cGlyZXNcbiAgICBwYXJhbXNbXCJBQ0xcIl0gPSBhY2wgaWYgYWNsXG4gICAgcGFyYW1zW1wiQ29udGVudExlbmd0aFwiXSA9IGNvbnRlbnRMZW5ndGggaWYgY29udGVudExlbmd0aFxuXG4gICAgQHMzLnVwbG9hZCBwYXJhbXMsIChlcnIsIGRhdGEpIC0+XG4gICAgICByZXR1cm4gY2IgZXJyIGlmIGVyclxuICAgICAgY2IgbnVsbCwgXCJodHRwczovLyN7YnVja2V0fS5zMy5hbWF6b25hd3MuY29tLyN7a2V5fVwiXG5cblxuICAjIFMzLnB1dE9iamVjdFxuICBwdXQ6IChvcHRpb25zID0ge30sIGNiKSAtPlxuICAgIHRocm93IG5ldyBFcnJvciAnQ2FsbGJhY2sgaXMgcmVxdWlyZWQnIHVubGVzcyBjYlxuICAgIHsgZXh0ZW5zaW9uLCBrZXksIGJ1Y2tldCwgZXhwaXJlcywgYWNsLCBjb250ZW50TGVuZ3RoIH0gPSBvcHRpb25zXG4gICAga2V5ID0gb3B0aW9ucy5rZXlcbiAgICBidWNrZXQgPSBvcHRpb25zLmJ1Y2tldFxuICAgIGV4dGVuc2lvbiA9IG9wdGlvbnMuZXh0ZW5zaW9uID8gbnVsbFxuICAgIGV4cGlyZXMgPSBvcHRpb25zLmV4cGlyZXMgPyBudWxsXG4gICAgYWNsID0gb3B0aW9ucy5hY2wgPyBudWxsXG5cbiAgICAjIEBUT0RPIG9wdGlvbnMgdHlwZSBjaGVja1xuICAgIHVubGVzcyBrZXkgYW5kIGJ1Y2tldFxuICAgICAgcmV0dXJuIGNiIG5ldyBFcnJvciAna2V5IGFuZCBidWNrZXQgYXJlIHJlcXVpcmVkJ1xuXG4gICAgcGFyYW1zID1cbiAgICAgIEJ1Y2tldDogYnVja2V0XG4gICAgICBLZXk6IGtleVxuXG4gICAgaWYgZXh0ZW5zaW9uXG4gICAgICBjb250ZW50VHlwZSA9IEBfY2hlY2tEYXRhRXh0ZW5zaW9uIGV4dGVuc2lvblxuICAgICAgcmV0dXJuIGNiIG5ldyBFcnJvciAnRGF0YSBleHRlbnNpb24gbm90IGFsbG93ZWQnIHVubGVzcyBjb250ZW50VHlwZVxuICAgICAgcGFyYW1zW1wiQ29udGVudFR5cGVcIl0gPSBjb250ZW50VHlwZVxuXG4gICAgcGFyYW1zW1wiQ2FjaGUtQ29udHJvbFwiXSA9IFwibWF4LWFnZT0zMTUzNjAwMCwgaW1tdXRhYmxlXCJcbiAgICBwYXJhbXNbXCJFeHBpcmVzXCJdID0gbW9tZW50LnV0YyhleHBpcmVzKSBpZiBleHBpcmVzIGFuZCBfLmlzRGF0ZSBleHBpcmVzXG4gICAgcGFyYW1zW1wiQUNMXCJdID0gYWNsIGlmIGFjbFxuXG4gICAgQHMzLmdldFNpZ25lZFVybCBcInB1dE9iamVjdFwiLCBwYXJhbXMsIChlcnIsIGRhdGEpIC0+XG4gICAgICByZXR1cm4gY2IgZXJyIGlmIGVyclxuXG4gICAgICBwdXQgPVxuICAgICAgICAnc2lnbmVkX3VybCc6IGRhdGFcbiAgICAgICAgJ3B1YmxpY191cmwnOiBcImh0dHBzOi8vI3tidWNrZXR9LnMzLmFtYXpvbmF3cy5jb20vI3trZXl9XCJcblxuICAgICAgY2IgbnVsbCwgcHV0XG5cblxuICAjIENoZWNrIGRhdGEgdHlwZSBmcm9tIGFyckFsbG93ZWREYXRhRXh0ZW5zaW9uc1xuICBfY2hlY2tEYXRhRXh0ZW5zaW9uOiAoZGF0YUV4dGVuc2lvbikgLT5cbiAgICByZXR1cm4gZmFsc2UgaWYgbm90IGRhdGFFeHRlbnNpb24gb3IgKEBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnMgYW5kIGRhdGFFeHRlbnNpb24gbm90IGluIEBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnMpXG4gICAgcmV0dXJuIG1pbWUubG9va3VwIGRhdGFFeHRlbnNpb25cblxuXG4gICMgQ2hlY2sgYWxsb3dlZCBkYXRhIHR5cGVzXG4gIF9jaGVja0FsbG93ZWREYXRhRXh0ZW5zaW9uczogKGFyckFsbG93ZWREYXRhRXh0ZW5zaW9ucykgLT5cbiAgICByZXR1cm4gZmFsc2UgdW5sZXNzIGFyckFsbG93ZWREYXRhRXh0ZW5zaW9uc1xuXG4gICAgdW5sZXNzIF8uaXNBcnJheSBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnNcbiAgICAgIHRocm93IG5ldyBFcnJvciBcIkFsbG93ZWQgZGF0YSBleHRlbnNpb25zIG11c3QgYmUgYXJyYXkgb2Ygc3RyaW5nc1wiXG5cbiAgICBmb3IgZXh0IG9mIGFyckFsbG93ZWREYXRhRXh0ZW5zaW9uc1xuICAgICAgdW5sZXNzIF8uaXNTdHJpbmcgZXh0XG4gICAgICAgIHRocm93IG5ldyBFcnJvciBcIkV4dGVuc2lvbnMgbXVzdCBiZSBhIHN0cmluZ3NcIlxuXG4gICAgcmV0dXJuIHRydWVcblxuXG4gICMgQ2hlY2sgb3B0aW9ucyBwYXJhbXNcbiAgX2NoZWNrT3B0aW9uczogKG9wdGlvbnMgPSB7fSkgLT5cbiAgICB7XG4gICAgICBAYWNjZXNzS2V5SWQsIEBzZWNyZXRBY2Nlc3NLZXksIEByZWdpb24sIEBzaWduYXR1cmVWZXJzaW9uLCBAbWF4UmV0cmllcywgQG1heFJlZGlyZWN0cywgQHN5c3RlbUNsb2NrT2Zmc2V0LFxuICAgICAgQHNzbEVuYWJsZWQsIEBwYXJhbVZhbGlkYXRpb24sIEBjb21wdXRlQ2hlY2tzdW1zLCBAY29udmVydFJlc3BvbnNlVHlwZXMsIEBzM0ZvcmNlUGF0aFN0eWxlLCBAczNCdWNrZXRFbmRwb2ludCxcbiAgICAgIEBhcGlWZXJzaW9uLCBAaHR0cE9wdGlvbnMsIEBhcGlWZXJzaW9ucywgQHNlc3Npb25Ub2tlbiwgQGNyZWRlbnRpYWxzLCBAY3JlZGVudGlhbFByb3ZpZGVyLCBAbG9nZ2VyXG4gICAgfSA9IG9wdGlvbnNcblxuICAgIHVubGVzcyBAYWNjZXNzS2V5SWRcbiAgICAgIHRocm93IG5ldyBFcnJvciBcImFjY2Vzc0tleUlkIGlzIHJlcXVpcmVkXCJcblxuICAgIHVubGVzcyBAc2VjcmV0QWNjZXNzS2V5XG4gICAgICB0aHJvdyBuZXcgRXJyb3IgXCJzZWNyZXRBY2Nlc3NLZXkgaXMgcmVxdWlyZWRcIlxuXG4gICAgdW5sZXNzIEByZWdpb25cbiAgICAgIHRocm93IG5ldyBFcnJvciBcInJlZ2lvbiBpcyByZXF1aXJlZFwiXG5cbiAgICB1bmxlc3MgXy5pc1N0cmluZyBAYWNjZXNzS2V5SWRcbiAgICAgIHRocm93IG5ldyBFcnJvciBcImFjY2Vzc0tleUlkIG11c3QgYmUgYSBzdHJpbmdcIlxuXG4gICAgdW5sZXNzIF8uaXNTdHJpbmcgQHNlY3JldEFjY2Vzc0tleVxuICAgICAgdGhyb3cgbmV3IEVycm9yIFwic2VjcmV0QWNjZXNzS2V5IG11c3QgYmUgYSBzdHJpbmdcIlxuXG4gICAgdW5sZXNzIF8uaXNTdHJpbmcgQHJlZ2lvblxuICAgICAgdGhyb3cgbmV3IEVycm9yIFwicmVnaW9uIG11c3QgYmUgYSBzdHJpbmdcIlxuXG4gICAgaWYgQHNpZ25hdHVyZVZlcnNpb24gYW5kIG5vdCBfLmlzU3RyaW5nIEBzaWduYXR1cmVWZXJzaW9uXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgXCJzaWduYXR1cmVWZXJzaW9uIG11c3QgYmUgYSBzdHJpbmdcIlxuXG4gICAgaWYgQG1heFJldHJpZXMgYW5kIG5vdCBfLmlzSW50ZWdlciBAbWF4UmV0cmllc1xuICAgICAgdGhyb3cgbmV3IEVycm9yICdtYXhSZXRyaWVzIG11c3QgYmUgYSBpbnRlZ2VyJ1xuXG4gICAgaWYgQG1heFJlZGlyZWN0cyBhbmQgbm90IF8uaXNJbnRlZ2VyIEBtYXhSZWRpcmVjdHNcbiAgICAgIHRocm93IG5ldyBFcnJvciAnbWF4UmVkaXJlY3RzIG11c3QgYmUgYSBpbnRlZ2VyJ1xuXG4gICAgaWYgQHN5c3RlbUNsb2NrT2Zmc2V0IGFuZCBub3QgXy5pc051bWJlciBAc3lzdGVtQ2xvY2tPZmZzZXRcbiAgICAgIHRocm93IG5ldyBFcnJvciAnc3lzdGVtQ2xvY2tPZmZzZXQgbXVzdCBiZSBhIG51bWJlcidcblxuICAgIGlmIEBzc2xFbmFibGVkIGFuZCBub3QgXy5pc0Jvb2xlYW4gQHNzbEVuYWJsZWRcbiAgICAgIHRocm93IG5ldyBFcnJvciAnc3NsRW5hYmxlZCBtdXN0IGJlIGEgYm9vbGVhbidcblxuICAgIGlmIEBwYXJhbVZhbGlkYXRpb24gYW5kIG5vdCBfLmlzQm9vbGVhbiBAcGFyYW1WYWxpZGF0aW9uXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ3BhcmFtVmFsaWRhdGlvbiBtdXN0IGJlIGEgYm9vbGVhbidcblxuICAgIGlmIEBjb21wdXRlQ2hlY2tzdW1zIGFuZCBub3QgXy5pc0Jvb2xlYW4gQGNvbXB1dGVDaGVja3N1bXNcbiAgICAgIHRocm93IG5ldyBFcnJvciAnY29tcHV0ZUNoZWNrc3VtcyBtdXN0IGJlIGEgYm9vbGVhbidcblxuICAgIGlmIEBjb252ZXJ0UmVzcG9uc2VUeXBlcyBhbmQgbm90IF8uaXNCb29sZWFuIEBjb252ZXJ0UmVzcG9uc2VUeXBlc1xuICAgICAgdGhyb3cgbmV3IEVycm9yICdjb252ZXJ0UmVzcG9uc2VUeXBlcyBtdXN0IGJlIGEgYm9vbGVhbidcblxuICAgIGlmIEBzM0ZvcmNlUGF0aFN0eWxlIGFuZCBub3QgXy5pc0Jvb2xlYW4gQHMzRm9yY2VQYXRoU3R5bGVcbiAgICAgIHRocm93IG5ldyBFcnJvciAnczNGb3JjZVBhdGhTdHlsZSBtdXN0IGJlIGEgYm9vbGVhbidcblxuICAgIGlmIEBzM0J1Y2tldEVuZHBvaW50IGFuZCBub3QgXy5pc0Jvb2xlYW4gQHMzQnVja2V0RW5kcG9pbnRcbiAgICAgIHRocm93IG5ldyBFcnJvciAnczNCdWNrZXRFbmRwb2ludCBtdXN0IGJlIGEgYm9vbGVhbidcblxuICAgIGlmIEBodHRwT3B0aW9ucyBhbmQgbm90IF8uaXNQbGFpbk9iamVjdCBAaHR0cE9wdGlvbnNcbiAgICAgIHRocm93IG5ldyBFcnJvciAnaHR0cE9wdGlvbnMgbXVzdCBiZSBhIGRpY3Qgd2l0aCBwYXJhbXM6IHByb3h5LCBhZ2VudCwgdGltZW91dCwgeGhyQXN5bmMsIHhocldpdGhDcmVkZW50aWFscydcblxuICAgIGlmIEBhcGlWZXJzaW9ucyBhbmQgbm90IF8uaXNQbGFpbk9iamVjdCBAYXBpVmVyc2lvbnNcbiAgICAgIHRocm93IG5ldyBFcnJvciAnYXBpVmVyc2lvbnMgbXVzdCBiZSBhIGRpY3Qgd2l0aCB2ZXJzaW9ucydcblxuICAgIGlmIEBhcGlWZXJzaW9uIGFuZCBub3QgKF8uaXNTdHJpbmcgQGFwaVZlcnNpb24gb3IgXy5pc0RhdGUgQGFwaVZlcnNpb24pXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ2FwaVZlcnNpb24gbXVzdCBiZSBhIHN0cmluZyBvciBkYXRlJ1xuXG4gICAgaWYgQHNlc3Npb25Ub2tlbiBhbmQgbm90IEBzZXNzaW9uVG9rZW4gaW5zdGFuY2VvZiBhd3MuQ3JlZGVudGlhbHNcbiAgICAgIHRocm93IG5ldyBFcnJvciAnc2Vzc2lvblRva2VuIG11c3QgYmUgYSBBV1MuQ3JlZGVudGlhbHMnXG5cbiAgICBpZiBAY3JlZGVudGlhbHMgYW5kIG5vdCBAY3JlZGVudGlhbHMgaW5zdGFuY2VvZiBhd3MuQ3JlZGVudGlhbHNcbiAgICAgIHRocm93IG5ldyBFcnJvciAnY3JlZGVudGlhbHMgbXVzdCBiZSBhIEFXUy5DcmVkZW50aWFscydcblxuICAgIGlmIEBjcmVkZW50aWFsUHJvdmlkZXIgYW5kIG5vdCBAY3JlZGVudGlhbFByb3ZpZGVyIGluc3RhbmNlb2YgYXdzLkNyZWRlbnRpYWxzUHJvdmlkZXJDaGFpblxuICAgICAgdGhyb3cgbmV3IEVycm9yICdjcmVkZW50aWFsUHJvdmlkZXIgbXVzdCBiZSBhIEFXUy5DcmVkZW50aWFsc1Byb3ZpZGVyQ2hhaW4nXG5cbiAgICBpZiBAbG9nZ2VyIGFuZCBub3QgKEBsb2dnZXIud3JpdGUgYW5kIEBsb2dnZXIubG9nKVxuICAgICAgdGhyb3cgbmV3IEVycm9yICdsb2dnZXIgbXVzdCBoYXZlICN3cml0ZSBvciAjbG9nIG1ldGhvZHMnXG5cblxuIyBFeHBvcnRzXG5tb2R1bGUuZXhwb3J0cyA9IFMzQ2xpZW50XG5cbiJdfQ==
