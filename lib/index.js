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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGliL2luZGV4LmpzIiwic291cmNlcyI6WyJsaWIvaW5kZXguY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLElBQUEsaUNBQUE7RUFBQTs7QUFBQSxDQUFBLEdBQVUsT0FBQSxDQUFRLFFBQVI7O0FBQ1YsSUFBQSxHQUFVLE9BQUEsQ0FBUSxNQUFSOztBQUNWLE1BQUEsR0FBVSxPQUFBLENBQVEsUUFBUjs7QUFDVixNQUFBLEdBQVUsT0FBQSxDQUFRLFFBQVI7O0FBR0o7RUFDUyxrQkFBQyxPQUFELEVBQWUsd0JBQWY7QUFDWCxRQUFBOztNQURZLFVBQVU7O0lBQ3RCLEdBQUEsR0FBTSxPQUFBLENBQVEsU0FBUjtJQUVOLElBQUEsQ0FBQSxDQUE4QixPQUFBLFlBQW1CLEdBQUcsQ0FBQyxNQUFyRCxDQUFBO01BQUEsSUFBQyxDQUFBLGFBQUQsQ0FBZSxPQUFmLEVBQUE7O0lBQ0EsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFYLENBQWtCLE9BQWxCO0lBRUEsSUFBQyxDQUFBLEVBQUQsR0FBVSxJQUFBLEdBQUcsQ0FBQyxFQUFKLENBQUE7SUFFVixJQUFDLENBQUEsd0JBQUQsR0FBNEI7SUFDNUIsSUFBRyx3QkFBQSxJQUE2QixJQUFDLENBQUEsMkJBQUQsQ0FBNkIsd0JBQTdCLENBQWhDO01BQ0UsSUFBQyxDQUFBLHdCQUFELEdBQTRCLHlCQUQ5Qjs7RUFUVzs7cUJBY2IsY0FBQSxHQUFnQixTQUFDLE9BQUQsRUFBZSxFQUFmO0FBQ2QsUUFBQTs7TUFEZSxVQUFVOztJQUN6QixJQUFBLENBQThDLEVBQTlDO0FBQUEsWUFBVSxJQUFBLEtBQUEsQ0FBTSxzQkFBTixFQUFWOztJQUNFLDZCQUFGLEVBQWEsaUJBQWIsRUFBa0IsdUJBQWxCLEVBQTBCLHlCQUExQixFQUFtQyxpQkFBbkMsRUFBd0MscUNBQXhDLEVBQXVELDZCQUF2RCxFQUFrRSx1QkFBbEUsRUFBMEUsMkNBQTFFLEVBQTRGO0lBQzVGLEdBQUEsR0FBTSxPQUFPLENBQUM7SUFDZCxNQUFB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LENBQUksQ0FBQyxJQUFDLENBQUEsTUFBTSxDQUFDLEtBQVIsSUFBa0IsSUFBQyxDQUFBLE1BQU0sQ0FBQyxHQUEzQixDQUFuQjtBQUNFLFlBQVUsSUFBQSxLQUFBLENBQU0seUNBQU4sRUFEWjs7RUF6RWE7Ozs7OztBQThFakIsTUFBTSxDQUFDLE9BQVAsR0FBaUIiLCJzb3VyY2VzQ29udGVudCI6WyIjIHMzLWJyb3dzZXItZGlyZWN0LXVwbG9hZFxuXyAgICAgICA9IHJlcXVpcmUoJ2xvZGFzaCcpXG5taW1lICAgID0gcmVxdWlyZSgnbWltZScpXG5tb21lbnQgID0gcmVxdWlyZSgnbW9tZW50JylcbmNyeXB0byAgPSByZXF1aXJlKCdjcnlwdG8nKVxuXG5cbmNsYXNzIFMzQ2xpZW50XG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucyA9IHt9LCBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnMpIC0+XG4gICAgYXdzID0gcmVxdWlyZSgnYXdzLXNkaycpXG5cbiAgICBAX2NoZWNrT3B0aW9ucyBvcHRpb25zIHVubGVzcyBvcHRpb25zIGluc3RhbmNlb2YgYXdzLkNvbmZpZ1xuICAgIGF3cy5jb25maWcudXBkYXRlIG9wdGlvbnNcblxuICAgIEBzMyA9IG5ldyBhd3MuUzMoKVxuXG4gICAgQGFyckFsbG93ZWREYXRhRXh0ZW5zaW9ucyA9IG51bGxcbiAgICBpZiBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnMgYW5kIEBfY2hlY2tBbGxvd2VkRGF0YUV4dGVuc2lvbnMgYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zXG4gICAgICBAYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zID0gYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zXG5cblxuICAjIEJyb3dzZXIgZm9ybSBwb3N0IHBhcmFtcyBmb3IgdXBsb2FkaW5nXG4gIHVwbG9hZFBvc3RGb3JtOiAob3B0aW9ucyA9IHt9LCBjYikgLT5cbiAgICB0aHJvdyBuZXcgRXJyb3IgJ0NhbGxiYWNrIGlzIHJlcXVpcmVkJyB1bmxlc3MgY2JcbiAgICB7IGV4dGVuc2lvbiwga2V5LCBidWNrZXQsIGV4cGlyZXMsIGFjbCwgY29udGVudExlbmd0aCwgYWxnb3JpdGhtLCByZWdpb24sIHMzRm9yY2VQYXRoU3R5bGUsIGNvbmRpdGlvbk1hdGNoaW5nIH0gPSBvcHRpb25zXG4gICAga2V5ID0gb3B0aW9ucy5rZXlcbiAgICBidWNrZXQgPSBvcHRpb25zLmJ1Y2tldFxuICAgIHJlZ2lvbiA9IG9wdGlvbnMucmVnaW9uXG4gICAgZXh0ZW5zaW9uID0gb3B0aW9ucy5leHRlbnNpb24gPyBudWxsXG4gICAgZXhwaXJlcyA9IG9wdGlvbnMuZXhwaXJlcyA/IG1vbWVudC51dGMoKS5hZGQoNjAsICdtaW51dGVzJykudG9EYXRlKClcbiAgICBhY2wgPSBvcHRpb25zLmFjbCA/ICdwdWJsaWMtcmVhZCdcbiAgICBjb250ZW50TGVuZ3RoID0gb3B0aW9ucy5jb250ZW50TGVuZ3RoID8gbnVsbFxuICAgIGFsZ29yaXRobSA9IG9wdGlvbnMuYWxnb3JpdGhtID8gJ0FXUzQtSE1BQy1TSEEyNTYnXG4gICAgcmVnaW9uID0gb3B0aW9ucy5yZWdpb24gPyBAcmVnaW9uXG4gICAgY29uZGl0aW9uTWF0Y2hpbmcgPSBvcHRpb25zLmNvbmRpdGlvbk1hdGNoaW5nID8gbnVsbFxuXG4gICAgIyBAVE9ETyBvcHRpb25zIHR5cGUgY2hlY2tcbiAgICB1bmxlc3Mga2V5IGFuZCBidWNrZXRcbiAgICAgIHJldHVybiBjYiBuZXcgRXJyb3IgJ2tleSBhbmQgYnVja2V0IGFyZSByZXF1aXJlZCdcblxuICAgIGlmIGV4dGVuc2lvblxuICAgICAgY29udGVudFR5cGUgPSBAX2NoZWNrRGF0YUV4dGVuc2lvbiBleHRlbnNpb25cbiAgICAgIHJldHVybiBjYiBuZXcgRXJyb3IgJ0RhdGEgZXh0ZW5zaW9uIG5vdCBhbGxvd2VkJyB1bmxlc3MgY29udGVudFR5cGVcblxuICAgIGlmIGFsZ29yaXRobS5zcGxpdCgnLScpLmxlbmd0aCA9PSAzXG4gICAgICBhcnJBbGdvcml0aG0gPSBhbGdvcml0aG0uc3BsaXQoJy0nKVxuICAgICAgc2lndmVyID0gYXJyQWxnb3JpdGhtWzBdXG4gICAgICBoYXNoYWxnID0gYXJyQWxnb3JpdGhtWzJdLnRvTG93ZXJDYXNlKClcbiAgICBlbHNlXG4gICAgICBzaWd2ZXIgPSBcIkFXUzRcIlxuICAgICAgaGFzaGFsZyA9IFwic2hhMjU2XCJcblxuICAgIHBvbGljeURvYyA9IHt9XG5cbiAgICBwb2xpY3lEb2NbXCJleHBpcmF0aW9uXCJdID0gbW9tZW50LnV0YyhleHBpcmVzKS5mb3JtYXQoXCJZWVlZLU1NLUREW1RdSEg6TU06U1NbWl1cIikgaWYgZXhwaXJlcyBhbmQgXy5pc0RhdGUgZXhwaXJlc1xuICAgIHBvbGljeURvY1tcImNvbmRpdGlvbnNcIl0gPSBbXVxuXG4gICAgZGF0ZVNob3J0UG9saWN5ID0gbW9tZW50LnV0YygpLmZvcm1hdCgnWVlZWU1NREQnKVxuICAgIGRhdGVMb25nUG9saWN5ID0gbW9tZW50LnV0YygpLmZvcm1hdCgnWVlZWU1NRERbVF1ISE1NU1NbWl0nKVxuXG4gICAgcG9saWN5RG9jLmNvbmRpdGlvbnMucHVzaCB7ICdidWNrZXQnOiBidWNrZXQgfVxuICAgIHBvbGljeURvYy5jb25kaXRpb25zLnB1c2ggWyAnc3RhcnRzLXdpdGgnLCAnJGtleScsIGtleSBdXG4gICAgcG9saWN5RG9jLmNvbmRpdGlvbnMucHVzaCB7ICdhY2wnOiBhY2wgfVxuICAgIHBvbGljeURvYy5jb25kaXRpb25zLnB1c2ggWyAnc3RhcnRzLXdpdGgnLCAnJENvbnRlbnQtVHlwZScsIGNvbnRlbnRUeXBlIF0gaWYgY29udGVudFR5cGVcbiAgICBwb2xpY3lEb2MuY29uZGl0aW9ucy5wdXNoIFsgJ2NvbnRlbnQtbGVuZ3RoLXJhbmdlJywgMCwgY29udGVudExlbmd0aCBdIGlmIGNvbnRlbnRMZW5ndGhcbiAgICBwb2xpY3lEb2MuY29uZGl0aW9ucy5wdXNoIHsgXCJ4LWFtei1hbGdvcml0aG1cIjogYWxnb3JpdGhtIH1cbiAgICBwb2xpY3lEb2MuY29uZGl0aW9ucy5wdXNoIHsgXCJ4LWFtei1jcmVkZW50aWFsXCI6IFwiI3tAYWNjZXNzS2V5SWR9LyN7ZGF0ZVNob3J0UG9saWN5fS8je3JlZ2lvbn0vczMvYXdzNF9yZXF1ZXN0XCIgfVxuICAgIHBvbGljeURvYy5jb25kaXRpb25zLnB1c2ggeyBcIngtYW16LWRhdGVcIjogZGF0ZUxvbmdQb2xpY3l9XG5cbiAgICBpZiBjb25kaXRpb25NYXRjaGluZyBhbmQgXy5pc0FycmF5IGNvbmRpdGlvbk1hdGNoaW5nXG4gICAgICBwb2xpY3lEb2MuY29uZGl0aW9ucyA9IF8udW5pb24gY29uZGl0aW9uTWF0Y2hpbmcsIHBvbGljeURvYy5jb25kaXRpb25zXG5cbiAgICBkYXRlS2V5ID0gY3J5cHRvLmNyZWF0ZUhtYWMoaGFzaGFsZywgXCIje3NpZ3Zlcn0je0BzZWNyZXRBY2Nlc3NLZXl9XCIpLnVwZGF0ZShkYXRlU2hvcnRQb2xpY3kpLmRpZ2VzdCgpXG4gICAgZGF0ZVJlZ2lvbktleSA9IGNyeXB0by5jcmVhdGVIbWFjKGhhc2hhbGcsIGRhdGVLZXkpLnVwZGF0ZShyZWdpb24pLmRpZ2VzdCgpXG4gICAgZGF0ZVJlZ2lvblNlcnZpY2VLZXkgPSBjcnlwdG8uY3JlYXRlSG1hYyhoYXNoYWxnLCBkYXRlUmVnaW9uS2V5KS51cGRhdGUoJ3MzJykuZGlnZXN0KClcbiAgICBzaWduaW5nS2V5ID0gY3J5cHRvLmNyZWF0ZUhtYWMoaGFzaGFsZywgZGF0ZVJlZ2lvblNlcnZpY2VLZXkpLnVwZGF0ZShcIiN7c2lndmVyLnRvTG93ZXJDYXNlKCl9X3JlcXVlc3RcIikuZGlnZXN0KClcbiAgICBwb2xpY3kgPSBuZXcgQnVmZmVyKEpTT04uc3RyaW5naWZ5KHBvbGljeURvYykpLnRvU3RyaW5nKCdiYXNlNjQnKVxuICAgIHNpZ25hdHVyZSA9IGNyeXB0by5jcmVhdGVIbWFjKGhhc2hhbGcsc2lnbmluZ0tleSkudXBkYXRlKHBvbGljeSkuZGlnZXN0KCdoZXgnKVxuXG4gICAgc3RyZWFtID0ge31cbiAgICBzdHJlYW1bJ3BhcmFtcyddID1cbiAgICAgIFwia2V5XCI6IGtleVxuICAgICAgXCJhY2xcIjogYWNsXG4gICAgICBcIngtYW16LWFsZ29yaXRobVwiOiBhbGdvcml0aG1cbiAgICAgIFwieC1hbXotY3JlZGVudGlhbFwiOiBcIiN7QGFjY2Vzc0tleUlkfS8je2RhdGVTaG9ydFBvbGljeX0vI3tyZWdpb259L3MzLyN7c2lndmVyLnRvTG93ZXJDYXNlKCl9X3JlcXVlc3RcIlxuICAgICAgXCJ4LWFtei1kYXRlXCI6IGRhdGVMb25nUG9saWN5XG4gICAgICBcInBvbGljeVwiOiBwb2xpY3lcbiAgICAgIFwieC1hbXotc2lnbmF0dXJlXCI6IHNpZ25hdHVyZVxuICAgIHN0cmVhbS5wYXJhbXNbJ2NvbnRlbnQtdHlwZSddID0gY29udGVudFR5cGUgaWYgY29udGVudFR5cGVcbiAgICBzdHJlYW1bJ2NvbmRpdGlvbnMnXSAgPSBjb25kaXRpb25NYXRjaGluZyBpZiBjb25kaXRpb25NYXRjaGluZ1xuICAgIGlmIHRoaXMuczNGb3JjZVBhdGhTdHlsZVxuICAgICAgc3RyZWFtWydwdWJsaWNfdXJsJ10gID0gXCJodHRwczovL3MzLSN7cmVnaW9ufS5hbWF6b25hd3MuY29tLyN7YnVja2V0fS8je2tleX1cIlxuICAgICAgc3RyZWFtWydmb3JtX3VybCddICAgID0gXCJodHRwczovL3MzLSN7cmVnaW9ufS5hbWF6b25hd3MuY29tLyN7YnVja2V0fS9cIlxuICAgIGVsc2VcbiAgICAgIHN0cmVhbVsncHVibGljX3VybCddICA9IFwiaHR0cHM6Ly8je2J1Y2tldH0uczMuYW1hem9uYXdzLmNvbS8je2tleX1cIlxuICAgICAgc3RyZWFtWydmb3JtX3VybCddICAgID0gXCJodHRwczovLyN7YnVja2V0fS5zMy5hbWF6b25hd3MuY29tL1wiXG4gICAgY2IgbnVsbCwgc3RyZWFtXG5cblxuICAjIFMzLnVwbG9hZFxuICB1cGxvYWQ6IChvcHRpb25zID0ge30sIGNiKSAtPlxuICAgIHRocm93IG5ldyBFcnJvciAnQ2FsbGJhY2sgaXMgcmVxdWlyZWQnIHVubGVzcyBjYlxuICAgIHsgZGF0YSwgZXh0ZW5zaW9uLCBrZXksIGJ1Y2tldCwgZXhwaXJlcywgYWNsLCBjb250ZW50TGVuZ3RoIH0gPSBvcHRpb25zXG4gICAgZGF0YSA9IG9wdGlvbnMuZGF0YVxuICAgIGtleSA9IG9wdGlvbnMua2V5XG4gICAgYnVja2V0ID0gb3B0aW9ucy5idWNrZXRcbiAgICBleHRlbnNpb24gPSBvcHRpb25zLmV4dGVuc2lvbiA/IG51bGxcbiAgICBleHBpcmVzID0gb3B0aW9ucy5leHBpcmVzID8gbnVsbFxuICAgIGFjbCA9IG9wdGlvbnMuYWNsID8gbnVsbFxuICAgIGNvbnRlbnRMZW5ndGggPSBvcHRpb25zLmNvbnRlbnRMZW5ndGggPyBudWxsXG4gICAgXG4gICAgIyBAVE9ETyBvcHRpb25zIHR5cGUgY2hlY2tcbiAgICB1bmxlc3MgZGF0YSBhbmQga2V5IGFuZCBidWNrZXRcbiAgICAgIHJldHVybiBjYiBuZXcgRXJyb3IgJ2RhdGEsIGtleSBhbmQgYnVja2V0IGFyZSByZXF1aXJlZCdcblxuICAgIHBhcmFtcyA9XG4gICAgICBCdWNrZXQ6IGJ1Y2tldFxuICAgICAgS2V5OiBrZXlcbiAgICAgIEJvZHk6IGRhdGFcblxuICAgIGlmIGV4dGVuc2lvblxuICAgICAgY29udGVudFR5cGUgPSBAX2NoZWNrRGF0YUV4dGVuc2lvbiBleHRlbnNpb25cbiAgICAgIHJldHVybiBjYiBuZXcgRXJyb3IgJ0RhdGEgZXh0ZW5zaW9uIG5vdCBhbGxvd2VkJyB1bmxlc3MgY29udGVudFR5cGVcbiAgICAgIHBhcmFtc1tcIkNvbnRlbnRUeXBlXCJdID0gY29udGVudFR5cGVcblxuICAgIHBhcmFtc1tcIkV4cGlyZXNcIl0gPSBtb21lbnQudXRjKGV4cGlyZXMpIGlmIGV4cGlyZXMgYW5kIF8uaXNEYXRlIGV4cGlyZXNcbiAgICBwYXJhbXNbXCJBQ0xcIl0gPSBhY2wgaWYgYWNsXG4gICAgcGFyYW1zW1wiQ29udGVudExlbmd0aFwiXSA9IGNvbnRlbnRMZW5ndGggaWYgY29udGVudExlbmd0aFxuXG4gICAgQHMzLnVwbG9hZCBwYXJhbXMsIChlcnIsIGRhdGEpIC0+XG4gICAgICByZXR1cm4gY2IgZXJyIGlmIGVyclxuICAgICAgY2IgbnVsbCwgXCJodHRwczovLyN7YnVja2V0fS5zMy5hbWF6b25hd3MuY29tLyN7a2V5fVwiXG5cblxuICAjIFMzLnB1dE9iamVjdFxuICBwdXQ6IChvcHRpb25zID0ge30sIGNiKSAtPlxuICAgIHRocm93IG5ldyBFcnJvciAnQ2FsbGJhY2sgaXMgcmVxdWlyZWQnIHVubGVzcyBjYlxuICAgIHsgZXh0ZW5zaW9uLCBrZXksIGJ1Y2tldCwgZXhwaXJlcywgYWNsLCBjb250ZW50TGVuZ3RoIH0gPSBvcHRpb25zXG4gICAga2V5ID0gb3B0aW9ucy5rZXlcbiAgICBidWNrZXQgPSBvcHRpb25zLmJ1Y2tldFxuICAgIGV4dGVuc2lvbiA9IG9wdGlvbnMuZXh0ZW5zaW9uID8gbnVsbFxuICAgIGV4cGlyZXMgPSBvcHRpb25zLmV4cGlyZXMgPyBudWxsXG4gICAgYWNsID0gb3B0aW9ucy5hY2wgPyBudWxsXG5cbiAgICAjIEBUT0RPIG9wdGlvbnMgdHlwZSBjaGVja1xuICAgIHVubGVzcyBrZXkgYW5kIGJ1Y2tldFxuICAgICAgcmV0dXJuIGNiIG5ldyBFcnJvciAna2V5IGFuZCBidWNrZXQgYXJlIHJlcXVpcmVkJ1xuXG4gICAgcGFyYW1zID1cbiAgICAgIEJ1Y2tldDogYnVja2V0XG4gICAgICBLZXk6IGtleVxuXG4gICAgaWYgZXh0ZW5zaW9uXG4gICAgICBjb250ZW50VHlwZSA9IEBfY2hlY2tEYXRhRXh0ZW5zaW9uIGV4dGVuc2lvblxuICAgICAgcmV0dXJuIGNiIG5ldyBFcnJvciAnRGF0YSBleHRlbnNpb24gbm90IGFsbG93ZWQnIHVubGVzcyBjb250ZW50VHlwZVxuICAgICAgcGFyYW1zW1wiQ29udGVudFR5cGVcIl0gPSBjb250ZW50VHlwZVxuXG4gICAgcGFyYW1zW1wiRXhwaXJlc1wiXSA9IG1vbWVudC51dGMoZXhwaXJlcykgaWYgZXhwaXJlcyBhbmQgXy5pc0RhdGUgZXhwaXJlc1xuICAgIHBhcmFtc1tcIkFDTFwiXSA9IGFjbCBpZiBhY2xcblxuICAgIEBzMy5nZXRTaWduZWRVcmwgXCJwdXRPYmplY3RcIiwgcGFyYW1zLCAoZXJyLCBkYXRhKSAtPlxuICAgICAgcmV0dXJuIGNiIGVyciBpZiBlcnJcblxuICAgICAgcHV0ID1cbiAgICAgICAgJ3NpZ25lZF91cmwnOiBkYXRhXG4gICAgICAgICdwdWJsaWNfdXJsJzogXCJodHRwczovLyN7YnVja2V0fS5zMy5hbWF6b25hd3MuY29tLyN7a2V5fVwiXG5cbiAgICAgIGNiIG51bGwsIHB1dFxuXG5cbiAgIyBDaGVjayBkYXRhIHR5cGUgZnJvbSBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnNcbiAgX2NoZWNrRGF0YUV4dGVuc2lvbjogKGRhdGFFeHRlbnNpb24pIC0+XG4gICAgcmV0dXJuIGZhbHNlIGlmIG5vdCBkYXRhRXh0ZW5zaW9uIG9yIChAYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zIGFuZCBkYXRhRXh0ZW5zaW9uIG5vdCBpbiBAYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zKVxuICAgIHJldHVybiBtaW1lLmxvb2t1cCBkYXRhRXh0ZW5zaW9uXG5cblxuICAjIENoZWNrIGFsbG93ZWQgZGF0YSB0eXBlc1xuICBfY2hlY2tBbGxvd2VkRGF0YUV4dGVuc2lvbnM6IChhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnMpIC0+XG4gICAgcmV0dXJuIGZhbHNlIHVubGVzcyBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnNcblxuICAgIHVubGVzcyBfLmlzQXJyYXkgYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgXCJBbGxvd2VkIGRhdGEgZXh0ZW5zaW9ucyBtdXN0IGJlIGFycmF5IG9mIHN0cmluZ3NcIlxuXG4gICAgZm9yIGV4dCBvZiBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnNcbiAgICAgIHVubGVzcyBfLmlzU3RyaW5nIGV4dFxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IgXCJFeHRlbnNpb25zIG11c3QgYmUgYSBzdHJpbmdzXCJcblxuICAgIHJldHVybiB0cnVlXG5cblxuICAjIENoZWNrIG9wdGlvbnMgcGFyYW1zXG4gIF9jaGVja09wdGlvbnM6IChvcHRpb25zID0ge30pIC0+XG4gICAge1xuICAgICAgQGFjY2Vzc0tleUlkLCBAc2VjcmV0QWNjZXNzS2V5LCBAcmVnaW9uLCBAc2lnbmF0dXJlVmVyc2lvbiwgQG1heFJldHJpZXMsIEBtYXhSZWRpcmVjdHMsIEBzeXN0ZW1DbG9ja09mZnNldCxcbiAgICAgIEBzc2xFbmFibGVkLCBAcGFyYW1WYWxpZGF0aW9uLCBAY29tcHV0ZUNoZWNrc3VtcywgQGNvbnZlcnRSZXNwb25zZVR5cGVzLCBAczNGb3JjZVBhdGhTdHlsZSwgQHMzQnVja2V0RW5kcG9pbnQsXG4gICAgICBAYXBpVmVyc2lvbiwgQGh0dHBPcHRpb25zLCBAYXBpVmVyc2lvbnMsIEBzZXNzaW9uVG9rZW4sIEBjcmVkZW50aWFscywgQGNyZWRlbnRpYWxQcm92aWRlciwgQGxvZ2dlclxuICAgIH0gPSBvcHRpb25zXG5cbiAgICB1bmxlc3MgQGFjY2Vzc0tleUlkXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgXCJhY2Nlc3NLZXlJZCBpcyByZXF1aXJlZFwiXG5cbiAgICB1bmxlc3MgQHNlY3JldEFjY2Vzc0tleVxuICAgICAgdGhyb3cgbmV3IEVycm9yIFwic2VjcmV0QWNjZXNzS2V5IGlzIHJlcXVpcmVkXCJcblxuICAgIHVubGVzcyBAcmVnaW9uXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgXCJyZWdpb24gaXMgcmVxdWlyZWRcIlxuXG4gICAgdW5sZXNzIF8uaXNTdHJpbmcgQGFjY2Vzc0tleUlkXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgXCJhY2Nlc3NLZXlJZCBtdXN0IGJlIGEgc3RyaW5nXCJcblxuICAgIHVubGVzcyBfLmlzU3RyaW5nIEBzZWNyZXRBY2Nlc3NLZXlcbiAgICAgIHRocm93IG5ldyBFcnJvciBcInNlY3JldEFjY2Vzc0tleSBtdXN0IGJlIGEgc3RyaW5nXCJcblxuICAgIHVubGVzcyBfLmlzU3RyaW5nIEByZWdpb25cbiAgICAgIHRocm93IG5ldyBFcnJvciBcInJlZ2lvbiBtdXN0IGJlIGEgc3RyaW5nXCJcblxuICAgIGlmIEBzaWduYXR1cmVWZXJzaW9uIGFuZCBub3QgXy5pc1N0cmluZyBAc2lnbmF0dXJlVmVyc2lvblxuICAgICAgdGhyb3cgbmV3IEVycm9yIFwic2lnbmF0dXJlVmVyc2lvbiBtdXN0IGJlIGEgc3RyaW5nXCJcblxuICAgIGlmIEBtYXhSZXRyaWVzIGFuZCBub3QgXy5pc0ludGVnZXIgQG1heFJldHJpZXNcbiAgICAgIHRocm93IG5ldyBFcnJvciAnbWF4UmV0cmllcyBtdXN0IGJlIGEgaW50ZWdlcidcblxuICAgIGlmIEBtYXhSZWRpcmVjdHMgYW5kIG5vdCBfLmlzSW50ZWdlciBAbWF4UmVkaXJlY3RzXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ21heFJlZGlyZWN0cyBtdXN0IGJlIGEgaW50ZWdlcidcblxuICAgIGlmIEBzeXN0ZW1DbG9ja09mZnNldCBhbmQgbm90IF8uaXNOdW1iZXIgQHN5c3RlbUNsb2NrT2Zmc2V0XG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ3N5c3RlbUNsb2NrT2Zmc2V0IG11c3QgYmUgYSBudW1iZXInXG5cbiAgICBpZiBAc3NsRW5hYmxlZCBhbmQgbm90IF8uaXNCb29sZWFuIEBzc2xFbmFibGVkXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ3NzbEVuYWJsZWQgbXVzdCBiZSBhIGJvb2xlYW4nXG5cbiAgICBpZiBAcGFyYW1WYWxpZGF0aW9uIGFuZCBub3QgXy5pc0Jvb2xlYW4gQHBhcmFtVmFsaWRhdGlvblxuICAgICAgdGhyb3cgbmV3IEVycm9yICdwYXJhbVZhbGlkYXRpb24gbXVzdCBiZSBhIGJvb2xlYW4nXG5cbiAgICBpZiBAY29tcHV0ZUNoZWNrc3VtcyBhbmQgbm90IF8uaXNCb29sZWFuIEBjb21wdXRlQ2hlY2tzdW1zXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ2NvbXB1dGVDaGVja3N1bXMgbXVzdCBiZSBhIGJvb2xlYW4nXG5cbiAgICBpZiBAY29udmVydFJlc3BvbnNlVHlwZXMgYW5kIG5vdCBfLmlzQm9vbGVhbiBAY29udmVydFJlc3BvbnNlVHlwZXNcbiAgICAgIHRocm93IG5ldyBFcnJvciAnY29udmVydFJlc3BvbnNlVHlwZXMgbXVzdCBiZSBhIGJvb2xlYW4nXG5cbiAgICBpZiBAczNGb3JjZVBhdGhTdHlsZSBhbmQgbm90IF8uaXNCb29sZWFuIEBzM0ZvcmNlUGF0aFN0eWxlXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ3MzRm9yY2VQYXRoU3R5bGUgbXVzdCBiZSBhIGJvb2xlYW4nXG5cbiAgICBpZiBAczNCdWNrZXRFbmRwb2ludCBhbmQgbm90IF8uaXNCb29sZWFuIEBzM0J1Y2tldEVuZHBvaW50XG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ3MzQnVja2V0RW5kcG9pbnQgbXVzdCBiZSBhIGJvb2xlYW4nXG5cbiAgICBpZiBAaHR0cE9wdGlvbnMgYW5kIG5vdCBfLmlzUGxhaW5PYmplY3QgQGh0dHBPcHRpb25zXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ2h0dHBPcHRpb25zIG11c3QgYmUgYSBkaWN0IHdpdGggcGFyYW1zOiBwcm94eSwgYWdlbnQsIHRpbWVvdXQsIHhockFzeW5jLCB4aHJXaXRoQ3JlZGVudGlhbHMnXG5cbiAgICBpZiBAYXBpVmVyc2lvbnMgYW5kIG5vdCBfLmlzUGxhaW5PYmplY3QgQGFwaVZlcnNpb25zXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ2FwaVZlcnNpb25zIG11c3QgYmUgYSBkaWN0IHdpdGggdmVyc2lvbnMnXG5cbiAgICBpZiBAYXBpVmVyc2lvbiBhbmQgbm90IChfLmlzU3RyaW5nIEBhcGlWZXJzaW9uIG9yIF8uaXNEYXRlIEBhcGlWZXJzaW9uKVxuICAgICAgdGhyb3cgbmV3IEVycm9yICdhcGlWZXJzaW9uIG11c3QgYmUgYSBzdHJpbmcgb3IgZGF0ZSdcblxuICAgIGlmIEBzZXNzaW9uVG9rZW4gYW5kIG5vdCBAc2Vzc2lvblRva2VuIGluc3RhbmNlb2YgYXdzLkNyZWRlbnRpYWxzXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ3Nlc3Npb25Ub2tlbiBtdXN0IGJlIGEgQVdTLkNyZWRlbnRpYWxzJ1xuXG4gICAgaWYgQGNyZWRlbnRpYWxzIGFuZCBub3QgQGNyZWRlbnRpYWxzIGluc3RhbmNlb2YgYXdzLkNyZWRlbnRpYWxzXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ2NyZWRlbnRpYWxzIG11c3QgYmUgYSBBV1MuQ3JlZGVudGlhbHMnXG5cbiAgICBpZiBAY3JlZGVudGlhbFByb3ZpZGVyIGFuZCBub3QgQGNyZWRlbnRpYWxQcm92aWRlciBpbnN0YW5jZW9mIGF3cy5DcmVkZW50aWFsc1Byb3ZpZGVyQ2hhaW5cbiAgICAgIHRocm93IG5ldyBFcnJvciAnY3JlZGVudGlhbFByb3ZpZGVyIG11c3QgYmUgYSBBV1MuQ3JlZGVudGlhbHNQcm92aWRlckNoYWluJ1xuXG4gICAgaWYgQGxvZ2dlciBhbmQgbm90IChAbG9nZ2VyLndyaXRlIGFuZCBAbG9nZ2VyLmxvZylcbiAgICAgIHRocm93IG5ldyBFcnJvciAnbG9nZ2VyIG11c3QgaGF2ZSAjd3JpdGUgb3IgI2xvZyBtZXRob2RzJ1xuXG5cbiMgRXhwb3J0c1xubW9kdWxlLmV4cG9ydHMgPSBTM0NsaWVudFxuXG4iXX0=
