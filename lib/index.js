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
    policyDoc.conditions.push(['starts-with', '$key', '']);
    policyDoc.conditions.push({
      'acl': acl
    });
    if (cacheControl) {
      policyDoc.conditions.push({
        'cache-control': cacheControl
      });
    }
    if (contentDisposition) {
      policyDoc.conditions.push(['starts-with', '$Content-Disposition', '']);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGliL2luZGV4LmpzIiwic291cmNlcyI6WyJsaWIvaW5kZXguY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLElBQUEsaUNBQUE7RUFBQTs7QUFBQSxDQUFBLEdBQVUsT0FBQSxDQUFRLFFBQVI7O0FBQ1YsSUFBQSxHQUFVLE9BQUEsQ0FBUSxNQUFSOztBQUNWLE1BQUEsR0FBVSxPQUFBLENBQVEsUUFBUjs7QUFDVixNQUFBLEdBQVUsT0FBQSxDQUFRLFFBQVI7O0FBR0o7RUFDUyxrQkFBQyxPQUFELEVBQWUsd0JBQWY7QUFDWCxRQUFBOztNQURZLFVBQVU7O0lBQ3RCLEdBQUEsR0FBTSxPQUFBLENBQVEsU0FBUjtJQUVOLElBQUEsQ0FBQSxDQUE4QixPQUFBLFlBQW1CLEdBQUcsQ0FBQyxNQUFyRCxDQUFBO01BQUEsSUFBQyxDQUFBLGFBQUQsQ0FBZSxPQUFmLEVBQUE7O0lBQ0EsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFYLENBQWtCLE9BQWxCO0lBRUEsSUFBQyxDQUFBLEVBQUQsR0FBVSxJQUFBLEdBQUcsQ0FBQyxFQUFKLENBQUE7SUFFVixJQUFDLENBQUEsd0JBQUQsR0FBNEI7SUFDNUIsSUFBRyx3QkFBQSxJQUE2QixJQUFDLENBQUEsMkJBQUQsQ0FBNkIsd0JBQTdCLENBQWhDO01BQ0UsSUFBQyxDQUFBLHdCQUFELEdBQTRCLHlCQUQ5Qjs7RUFUVzs7cUJBY2IsY0FBQSxHQUFnQixTQUFDLE9BQUQsRUFBZSxFQUFmO0FBQ2QsUUFBQTs7TUFEZSxVQUFVOztJQUN6QixJQUFBLENBQThDLEVBQTlDO0FBQUEsWUFBVSxJQUFBLEtBQUEsQ0FBTSxzQkFBTixFQUFWOztJQUNFLDZCQUFGLEVBQWEsaUJBQWIsRUFBa0IsdUJBQWxCLEVBQTBCLHlCQUExQixFQUFtQyxpQkFBbkMsRUFBd0MscUNBQXhDLEVBQXVELDZCQUF2RCxFQUFrRSx1QkFBbEUsRUFBMEUsMkNBQTFFLEVBQTRGO0lBQzVGLEdBQUEsR0FBTSxPQUFPLENBQUM7SUFDZCxNQUFB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RyxJQUFDLENBQUEsVUFBRCxJQUFnQixDQUFJLENBQUMsQ0FBQyxDQUFDLFFBQUYsQ0FBVyxJQUFDLENBQUEsVUFBRCxJQUFlLENBQUMsQ0FBQyxNQUFGLENBQVMsSUFBQyxDQUFBLFVBQVYsQ0FBMUIsQ0FBRCxDQUF2QjtBQUNFLFlBQVUsSUFBQSxLQUFBLENBQU0scUNBQU4sRUFEWjs7SUFHQSxJQUFHLElBQUMsQ0FBQSxZQUFELElBQWtCLENBQUksSUFBQyxDQUFBLFlBQUwsWUFBNkIsR0FBRyxDQUFDLFdBQXREO0FBQ0UsWUFBVSxJQUFBLEtBQUEsQ0FBTSx3Q0FBTixFQURaOztJQUdBLElBQUcsSUFBQyxDQUFBLFdBQUQsSUFBaUIsQ0FBSSxJQUFDLENBQUEsV0FBTCxZQUE0QixHQUFHLENBQUMsV0FBcEQ7QUFDRSxZQUFVLElBQUEsS0FBQSxDQUFNLHVDQUFOLEVBRFo7O0lBR0EsSUFBRyxJQUFDLENBQUEsa0JBQUQsSUFBd0IsQ0FBSSxJQUFDLENBQUEsa0JBQUwsWUFBbUMsR0FBRyxDQUFDLHdCQUFsRTtBQUNFLFlBQVUsSUFBQSxLQUFBLENBQU0sMkRBQU4sRUFEWjs7SUFHQSxJQUFHLElBQUMsQ0FBQSxNQUFELElBQVksQ0FBSSxDQUFDLElBQUMsQ0FBQSxNQUFNLENBQUMsS0FBUixJQUFrQixJQUFDLENBQUEsTUFBTSxDQUFDLEdBQTNCLENBQW5CO0FBQ0UsWUFBVSxJQUFBLEtBQUEsQ0FBTSx5Q0FBTixFQURaOztFQXpFYTs7Ozs7O0FBOEVqQixNQUFNLENBQUMsT0FBUCxHQUFpQiIsInNvdXJjZXNDb250ZW50IjpbIiMgczMtYnJvd3Nlci1kaXJlY3QtdXBsb2FkXG5fICAgICAgID0gcmVxdWlyZSgnbG9kYXNoJylcbm1pbWUgICAgPSByZXF1aXJlKCdtaW1lJylcbm1vbWVudCAgPSByZXF1aXJlKCdtb21lbnQnKVxuY3J5cHRvICA9IHJlcXVpcmUoJ2NyeXB0bycpXG5cblxuY2xhc3MgUzNDbGllbnRcbiAgY29uc3RydWN0b3I6IChvcHRpb25zID0ge30sIGFyckFsbG93ZWREYXRhRXh0ZW5zaW9ucykgLT5cbiAgICBhd3MgPSByZXF1aXJlKCdhd3Mtc2RrJylcblxuICAgIEBfY2hlY2tPcHRpb25zIG9wdGlvbnMgdW5sZXNzIG9wdGlvbnMgaW5zdGFuY2VvZiBhd3MuQ29uZmlnXG4gICAgYXdzLmNvbmZpZy51cGRhdGUgb3B0aW9uc1xuXG4gICAgQHMzID0gbmV3IGF3cy5TMygpXG5cbiAgICBAYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zID0gbnVsbFxuICAgIGlmIGFyckFsbG93ZWREYXRhRXh0ZW5zaW9ucyBhbmQgQF9jaGVja0FsbG93ZWREYXRhRXh0ZW5zaW9ucyBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnNcbiAgICAgIEBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnMgPSBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnNcblxuXG4gICMgQnJvd3NlciBmb3JtIHBvc3QgcGFyYW1zIGZvciB1cGxvYWRpbmdcbiAgdXBsb2FkUG9zdEZvcm06IChvcHRpb25zID0ge30sIGNiKSAtPlxuICAgIHRocm93IG5ldyBFcnJvciAnQ2FsbGJhY2sgaXMgcmVxdWlyZWQnIHVubGVzcyBjYlxuICAgIHsgZXh0ZW5zaW9uLCBrZXksIGJ1Y2tldCwgZXhwaXJlcywgYWNsLCBjb250ZW50TGVuZ3RoLCBhbGdvcml0aG0sIHJlZ2lvbiwgczNGb3JjZVBhdGhTdHlsZSwgY29uZGl0aW9uTWF0Y2hpbmcgfSA9IG9wdGlvbnNcbiAgICBrZXkgPSBvcHRpb25zLmtleVxuICAgIGJ1Y2tldCA9IG9wdGlvbnMuYnVja2V0XG4gICAgcmVnaW9uID0gb3B0aW9ucy5yZWdpb25cbiAgICBleHRlbnNpb24gPSBvcHRpb25zLmV4dGVuc2lvbiA/IG51bGxcbiAgICBleHBpcmVzID0gb3B0aW9ucy5leHBpcmVzID8gbW9tZW50LnV0YygpLmFkZCg2MCwgJ21pbnV0ZXMnKS50b0RhdGUoKVxuICAgIGFjbCA9IG9wdGlvbnMuYWNsID8gJ3B1YmxpYy1yZWFkJ1xuICAgIGNvbnRlbnRMZW5ndGggPSBvcHRpb25zLmNvbnRlbnRMZW5ndGggPyBudWxsXG4gICAgYWxnb3JpdGhtID0gb3B0aW9ucy5hbGdvcml0aG0gPyAnQVdTNC1ITUFDLVNIQTI1NidcbiAgICByZWdpb24gPSBvcHRpb25zLnJlZ2lvbiA/IEByZWdpb25cbiAgICBjb25kaXRpb25NYXRjaGluZyA9IG9wdGlvbnMuY29uZGl0aW9uTWF0Y2hpbmcgPyBudWxsXG4gICAgY2FjaGVDb250cm9sID0gb3B0aW9ucy5jYWNoZUNvbnRyb2wgPyBudWxsXG4gICAgY29udGVudERpc3Bvc2l0aW9uID0gb3B0aW9ucy5jb250ZW50RGlzcG9zaXRpb24gPyBudWxsXG4gICAgIyBAVE9ETyBvcHRpb25zIHR5cGUgY2hlY2tcbiAgICB1bmxlc3Mga2V5IGFuZCBidWNrZXRcbiAgICAgIHJldHVybiBjYiBuZXcgRXJyb3IgJ2tleSBhbmQgYnVja2V0IGFyZSByZXF1aXJlZCdcblxuICAgIGlmIGV4dGVuc2lvblxuICAgICAgY29udGVudFR5cGUgPSBAX2NoZWNrRGF0YUV4dGVuc2lvbiBleHRlbnNpb25cbiAgICAgIHJldHVybiBjYiBuZXcgRXJyb3IgJ0RhdGEgZXh0ZW5zaW9uIG5vdCBhbGxvd2VkJyB1bmxlc3MgY29udGVudFR5cGVcblxuICAgIGlmIGFsZ29yaXRobS5zcGxpdCgnLScpLmxlbmd0aCA9PSAzXG4gICAgICBhcnJBbGdvcml0aG0gPSBhbGdvcml0aG0uc3BsaXQoJy0nKVxuICAgICAgc2lndmVyID0gYXJyQWxnb3JpdGhtWzBdXG4gICAgICBoYXNoYWxnID0gYXJyQWxnb3JpdGhtWzJdLnRvTG93ZXJDYXNlKClcbiAgICBlbHNlXG4gICAgICBzaWd2ZXIgPSBcIkFXUzRcIlxuICAgICAgaGFzaGFsZyA9IFwic2hhMjU2XCJcblxuICAgIHBvbGljeURvYyA9IHt9XG5cbiAgICBwb2xpY3lEb2NbXCJleHBpcmF0aW9uXCJdID0gbW9tZW50LnV0YyhleHBpcmVzKS5mb3JtYXQoXCJZWVlZLU1NLUREW1RdSEg6TU06U1NbWl1cIikgaWYgZXhwaXJlcyBhbmQgXy5pc0RhdGUgZXhwaXJlc1xuICAgIHBvbGljeURvY1tcImNvbmRpdGlvbnNcIl0gPSBbXVxuXG4gICAgZGF0ZVNob3J0UG9saWN5ID0gbW9tZW50LnV0YygpLmZvcm1hdCgnWVlZWU1NREQnKVxuICAgIGRhdGVMb25nUG9saWN5ID0gbW9tZW50LnV0YygpLmZvcm1hdCgnWVlZWU1NRERbVF1ISE1NU1NbWl0nKVxuXG4gICAgcG9saWN5RG9jLmNvbmRpdGlvbnMucHVzaCB7ICdidWNrZXQnOiBidWNrZXQgfVxuICAgIHBvbGljeURvYy5jb25kaXRpb25zLnB1c2ggWyAnc3RhcnRzLXdpdGgnLCAnJGtleScsICcnIF1cbiAgICBwb2xpY3lEb2MuY29uZGl0aW9ucy5wdXNoIHsgJ2FjbCc6IGFjbCB9XG4gICAgcG9saWN5RG9jLmNvbmRpdGlvbnMucHVzaCB7ICdjYWNoZS1jb250cm9sJzogY2FjaGVDb250cm9sIH0gaWYgY2FjaGVDb250cm9sXG4gICAgcG9saWN5RG9jLmNvbmRpdGlvbnMucHVzaCBbICdzdGFydHMtd2l0aCcsICckQ29udGVudC1EaXNwb3NpdGlvbicsICcnIF0gaWYgY29udGVudERpc3Bvc2l0aW9uXG4gICAgcG9saWN5RG9jLmNvbmRpdGlvbnMucHVzaCBbICdzdGFydHMtd2l0aCcsICckQ29udGVudC1UeXBlJywgJycgXSBpZiBjb250ZW50VHlwZVxuICAgIHBvbGljeURvYy5jb25kaXRpb25zLnB1c2ggWyAnY29udGVudC1sZW5ndGgtcmFuZ2UnLCAwLCBjb250ZW50TGVuZ3RoIF0gaWYgY29udGVudExlbmd0aFxuICAgIHBvbGljeURvYy5jb25kaXRpb25zLnB1c2ggeyBcIngtYW16LWFsZ29yaXRobVwiOiBhbGdvcml0aG0gfVxuICAgIHBvbGljeURvYy5jb25kaXRpb25zLnB1c2ggeyBcIngtYW16LWNyZWRlbnRpYWxcIjogXCIje0BhY2Nlc3NLZXlJZH0vI3tkYXRlU2hvcnRQb2xpY3l9LyN7cmVnaW9ufS9zMy9hd3M0X3JlcXVlc3RcIiB9XG4gICAgcG9saWN5RG9jLmNvbmRpdGlvbnMucHVzaCB7IFwieC1hbXotZGF0ZVwiOiBkYXRlTG9uZ1BvbGljeX1cblxuICAgIGlmIGNvbmRpdGlvbk1hdGNoaW5nIGFuZCBfLmlzQXJyYXkgY29uZGl0aW9uTWF0Y2hpbmdcbiAgICAgIHBvbGljeURvYy5jb25kaXRpb25zID0gXy51bmlvbiBjb25kaXRpb25NYXRjaGluZywgcG9saWN5RG9jLmNvbmRpdGlvbnNcblxuICAgIGRhdGVLZXkgPSBjcnlwdG8uY3JlYXRlSG1hYyhoYXNoYWxnLCBcIiN7c2lndmVyfSN7QHNlY3JldEFjY2Vzc0tleX1cIikudXBkYXRlKGRhdGVTaG9ydFBvbGljeSkuZGlnZXN0KClcbiAgICBkYXRlUmVnaW9uS2V5ID0gY3J5cHRvLmNyZWF0ZUhtYWMoaGFzaGFsZywgZGF0ZUtleSkudXBkYXRlKHJlZ2lvbikuZGlnZXN0KClcbiAgICBkYXRlUmVnaW9uU2VydmljZUtleSA9IGNyeXB0by5jcmVhdGVIbWFjKGhhc2hhbGcsIGRhdGVSZWdpb25LZXkpLnVwZGF0ZSgnczMnKS5kaWdlc3QoKVxuICAgIHNpZ25pbmdLZXkgPSBjcnlwdG8uY3JlYXRlSG1hYyhoYXNoYWxnLCBkYXRlUmVnaW9uU2VydmljZUtleSkudXBkYXRlKFwiI3tzaWd2ZXIudG9Mb3dlckNhc2UoKX1fcmVxdWVzdFwiKS5kaWdlc3QoKVxuICAgIHBvbGljeSA9IG5ldyBCdWZmZXIoSlNPTi5zdHJpbmdpZnkocG9saWN5RG9jKSkudG9TdHJpbmcoJ2Jhc2U2NCcpXG4gICAgc2lnbmF0dXJlID0gY3J5cHRvLmNyZWF0ZUhtYWMoaGFzaGFsZyxzaWduaW5nS2V5KS51cGRhdGUocG9saWN5KS5kaWdlc3QoJ2hleCcpXG5cbiAgICBzdHJlYW0gPSB7fVxuICAgIHN0cmVhbVsncGFyYW1zJ10gPVxuICAgICAgXCJrZXlcIjoga2V5XG4gICAgICBcImFjbFwiOiBhY2xcbiAgICAgIFwieC1hbXotYWxnb3JpdGhtXCI6IGFsZ29yaXRobVxuICAgICAgXCJ4LWFtei1jcmVkZW50aWFsXCI6IFwiI3tAYWNjZXNzS2V5SWR9LyN7ZGF0ZVNob3J0UG9saWN5fS8je3JlZ2lvbn0vczMvI3tzaWd2ZXIudG9Mb3dlckNhc2UoKX1fcmVxdWVzdFwiXG4gICAgICBcIngtYW16LWRhdGVcIjogZGF0ZUxvbmdQb2xpY3lcbiAgICAgIFwicG9saWN5XCI6IHBvbGljeVxuICAgICAgXCJ4LWFtei1zaWduYXR1cmVcIjogc2lnbmF0dXJlXG4gICAgc3RyZWFtLnBhcmFtc1snY29udGVudC10eXBlJ10gPSBjb250ZW50VHlwZSBpZiBjb250ZW50VHlwZVxuICAgIHN0cmVhbS5wYXJhbXNbJ2NhY2hlLWNvbnRyb2wnXSA9IGNhY2hlQ29udHJvbCBpZiBjYWNoZUNvbnRyb2xcbiAgICBzdHJlYW0ucGFyYW1zWydjb250ZW50LWRpc3Bvc2l0aW9uJ10gPSBjb250ZW50RGlzcG9zaXRpb24gaWYgY29udGVudERpc3Bvc2l0aW9uXG4gICAgc3RyZWFtWydjb25kaXRpb25zJ10gID0gY29uZGl0aW9uTWF0Y2hpbmcgaWYgY29uZGl0aW9uTWF0Y2hpbmdcbiAgICBpZiB0aGlzLnMzRm9yY2VQYXRoU3R5bGVcbiAgICAgIHN0cmVhbVsncHVibGljX3VybCddICA9IFwiaHR0cHM6Ly9zMy0je3JlZ2lvbn0uYW1hem9uYXdzLmNvbS8je2J1Y2tldH0vI3trZXl9XCJcbiAgICAgIHN0cmVhbVsnZm9ybV91cmwnXSAgICA9IFwiaHR0cHM6Ly9zMy0je3JlZ2lvbn0uYW1hem9uYXdzLmNvbS8je2J1Y2tldH0vXCJcbiAgICBlbHNlXG4gICAgICBzdHJlYW1bJ3B1YmxpY191cmwnXSAgPSBcImh0dHBzOi8vI3tidWNrZXR9LnMzLmFtYXpvbmF3cy5jb20vI3trZXl9XCJcbiAgICAgIHN0cmVhbVsnZm9ybV91cmwnXSAgICA9IFwiaHR0cHM6Ly8je2J1Y2tldH0uczMuYW1hem9uYXdzLmNvbS9cIlxuICAgIGNiIG51bGwsIHN0cmVhbVxuXG5cbiAgIyBTMy51cGxvYWRcbiAgdXBsb2FkOiAob3B0aW9ucyA9IHt9LCBjYikgLT5cbiAgICB0aHJvdyBuZXcgRXJyb3IgJ0NhbGxiYWNrIGlzIHJlcXVpcmVkJyB1bmxlc3MgY2JcbiAgICB7IGRhdGEsIGV4dGVuc2lvbiwga2V5LCBidWNrZXQsIGV4cGlyZXMsIGFjbCwgY29udGVudExlbmd0aCB9ID0gb3B0aW9uc1xuICAgIGRhdGEgPSBvcHRpb25zLmRhdGFcbiAgICBrZXkgPSBvcHRpb25zLmtleVxuICAgIGJ1Y2tldCA9IG9wdGlvbnMuYnVja2V0XG4gICAgZXh0ZW5zaW9uID0gb3B0aW9ucy5leHRlbnNpb24gPyBudWxsXG4gICAgZXhwaXJlcyA9IG9wdGlvbnMuZXhwaXJlcyA/IG51bGxcbiAgICBhY2wgPSBvcHRpb25zLmFjbCA/IG51bGxcbiAgICBjb250ZW50TGVuZ3RoID0gb3B0aW9ucy5jb250ZW50TGVuZ3RoID8gbnVsbFxuICAgIGNvbnRlbnREaXNwb3NpdGlvbiA9IG9wdGlvbnMuY29udGVudERpc3Bvc2l0aW9uID8gbnVsbFxuICAgIFxuICAgICMgQFRPRE8gb3B0aW9ucyB0eXBlIGNoZWNrXG4gICAgdW5sZXNzIGRhdGEgYW5kIGtleSBhbmQgYnVja2V0XG4gICAgICByZXR1cm4gY2IgbmV3IEVycm9yICdkYXRhLCBrZXkgYW5kIGJ1Y2tldCBhcmUgcmVxdWlyZWQnXG5cbiAgICBwYXJhbXMgPVxuICAgICAgQnVja2V0OiBidWNrZXRcbiAgICAgIEtleToga2V5XG4gICAgICBCb2R5OiBkYXRhXG5cbiAgICBpZiBleHRlbnNpb25cbiAgICAgIGNvbnRlbnRUeXBlID0gQF9jaGVja0RhdGFFeHRlbnNpb24gZXh0ZW5zaW9uXG4gICAgICByZXR1cm4gY2IgbmV3IEVycm9yICdEYXRhIGV4dGVuc2lvbiBub3QgYWxsb3dlZCcgdW5sZXNzIGNvbnRlbnRUeXBlXG4gICAgICBwYXJhbXNbXCJDb250ZW50VHlwZVwiXSA9IGNvbnRlbnRUeXBlXG5cbiAgICBwYXJhbXNbXCJDYWNoZS1Db250cm9sXCJdID0gY2FjaGVDb250cm9sIGlmIGNhY2hlQ29udHJvbFxuICAgIHBhcmFtc1tcIkNvbnRlbnQtRGlzcG9zaXRpb25cIl0gPSBjb250ZW50RGlzcG9zaXRpb24gaWYgY29udGVudERpc3Bvc2l0aW9uXG4gICAgcGFyYW1zW1wiRXhwaXJlc1wiXSA9IG1vbWVudC51dGMoZXhwaXJlcykgaWYgZXhwaXJlcyBhbmQgXy5pc0RhdGUgZXhwaXJlc1xuICAgIHBhcmFtc1tcIkFDTFwiXSA9IGFjbCBpZiBhY2xcbiAgICBwYXJhbXNbXCJDb250ZW50TGVuZ3RoXCJdID0gY29udGVudExlbmd0aCBpZiBjb250ZW50TGVuZ3RoXG5cbiAgICBAczMudXBsb2FkIHBhcmFtcywgKGVyciwgZGF0YSkgLT5cbiAgICAgIHJldHVybiBjYiBlcnIgaWYgZXJyXG4gICAgICBjYiBudWxsLCBcImh0dHBzOi8vI3tidWNrZXR9LnMzLmFtYXpvbmF3cy5jb20vI3trZXl9XCJcblxuXG4gICMgUzMucHV0T2JqZWN0XG4gIHB1dDogKG9wdGlvbnMgPSB7fSwgY2IpIC0+XG4gICAgdGhyb3cgbmV3IEVycm9yICdDYWxsYmFjayBpcyByZXF1aXJlZCcgdW5sZXNzIGNiXG4gICAgeyBleHRlbnNpb24sIGtleSwgYnVja2V0LCBleHBpcmVzLCBhY2wsIGNvbnRlbnRMZW5ndGggfSA9IG9wdGlvbnNcbiAgICBrZXkgPSBvcHRpb25zLmtleVxuICAgIGJ1Y2tldCA9IG9wdGlvbnMuYnVja2V0XG4gICAgZXh0ZW5zaW9uID0gb3B0aW9ucy5leHRlbnNpb24gPyBudWxsXG4gICAgZXhwaXJlcyA9IG9wdGlvbnMuZXhwaXJlcyA/IG51bGxcbiAgICBhY2wgPSBvcHRpb25zLmFjbCA/IG51bGxcblxuICAgICMgQFRPRE8gb3B0aW9ucyB0eXBlIGNoZWNrXG4gICAgdW5sZXNzIGtleSBhbmQgYnVja2V0XG4gICAgICByZXR1cm4gY2IgbmV3IEVycm9yICdrZXkgYW5kIGJ1Y2tldCBhcmUgcmVxdWlyZWQnXG5cbiAgICBwYXJhbXMgPVxuICAgICAgQnVja2V0OiBidWNrZXRcbiAgICAgIEtleToga2V5XG5cbiAgICBpZiBleHRlbnNpb25cbiAgICAgIGNvbnRlbnRUeXBlID0gQF9jaGVja0RhdGFFeHRlbnNpb24gZXh0ZW5zaW9uXG4gICAgICByZXR1cm4gY2IgbmV3IEVycm9yICdEYXRhIGV4dGVuc2lvbiBub3QgYWxsb3dlZCcgdW5sZXNzIGNvbnRlbnRUeXBlXG4gICAgICBwYXJhbXNbXCJDb250ZW50VHlwZVwiXSA9IGNvbnRlbnRUeXBlXG5cbiAgICBwYXJhbXNbXCJDYWNoZS1Db250cm9sXCJdID0gXCJtYXgtYWdlPTMxNTM2MDAwLCBpbW11dGFibGVcIlxuICAgIHBhcmFtc1tcIkV4cGlyZXNcIl0gPSBtb21lbnQudXRjKGV4cGlyZXMpIGlmIGV4cGlyZXMgYW5kIF8uaXNEYXRlIGV4cGlyZXNcbiAgICBwYXJhbXNbXCJBQ0xcIl0gPSBhY2wgaWYgYWNsXG5cbiAgICBAczMuZ2V0U2lnbmVkVXJsIFwicHV0T2JqZWN0XCIsIHBhcmFtcywgKGVyciwgZGF0YSkgLT5cbiAgICAgIHJldHVybiBjYiBlcnIgaWYgZXJyXG5cbiAgICAgIHB1dCA9XG4gICAgICAgICdzaWduZWRfdXJsJzogZGF0YVxuICAgICAgICAncHVibGljX3VybCc6IFwiaHR0cHM6Ly8je2J1Y2tldH0uczMuYW1hem9uYXdzLmNvbS8je2tleX1cIlxuXG4gICAgICBjYiBudWxsLCBwdXRcblxuXG4gICMgQ2hlY2sgZGF0YSB0eXBlIGZyb20gYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zXG4gIF9jaGVja0RhdGFFeHRlbnNpb246IChkYXRhRXh0ZW5zaW9uKSAtPlxuICAgIHJldHVybiBmYWxzZSBpZiBub3QgZGF0YUV4dGVuc2lvbiBvciAoQGFyckFsbG93ZWREYXRhRXh0ZW5zaW9ucyBhbmQgZGF0YUV4dGVuc2lvbiBub3QgaW4gQGFyckFsbG93ZWREYXRhRXh0ZW5zaW9ucylcbiAgICByZXR1cm4gbWltZS5sb29rdXAgZGF0YUV4dGVuc2lvblxuXG5cbiAgIyBDaGVjayBhbGxvd2VkIGRhdGEgdHlwZXNcbiAgX2NoZWNrQWxsb3dlZERhdGFFeHRlbnNpb25zOiAoYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zKSAtPlxuICAgIHJldHVybiBmYWxzZSB1bmxlc3MgYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zXG5cbiAgICB1bmxlc3MgXy5pc0FycmF5IGFyckFsbG93ZWREYXRhRXh0ZW5zaW9uc1xuICAgICAgdGhyb3cgbmV3IEVycm9yIFwiQWxsb3dlZCBkYXRhIGV4dGVuc2lvbnMgbXVzdCBiZSBhcnJheSBvZiBzdHJpbmdzXCJcblxuICAgIGZvciBleHQgb2YgYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zXG4gICAgICB1bmxlc3MgXy5pc1N0cmluZyBleHRcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yIFwiRXh0ZW5zaW9ucyBtdXN0IGJlIGEgc3RyaW5nc1wiXG5cbiAgICByZXR1cm4gdHJ1ZVxuXG5cbiAgIyBDaGVjayBvcHRpb25zIHBhcmFtc1xuICBfY2hlY2tPcHRpb25zOiAob3B0aW9ucyA9IHt9KSAtPlxuICAgIHtcbiAgICAgIEBhY2Nlc3NLZXlJZCwgQHNlY3JldEFjY2Vzc0tleSwgQHJlZ2lvbiwgQHNpZ25hdHVyZVZlcnNpb24sIEBtYXhSZXRyaWVzLCBAbWF4UmVkaXJlY3RzLCBAc3lzdGVtQ2xvY2tPZmZzZXQsXG4gICAgICBAc3NsRW5hYmxlZCwgQHBhcmFtVmFsaWRhdGlvbiwgQGNvbXB1dGVDaGVja3N1bXMsIEBjb252ZXJ0UmVzcG9uc2VUeXBlcywgQHMzRm9yY2VQYXRoU3R5bGUsIEBzM0J1Y2tldEVuZHBvaW50LFxuICAgICAgQGFwaVZlcnNpb24sIEBodHRwT3B0aW9ucywgQGFwaVZlcnNpb25zLCBAc2Vzc2lvblRva2VuLCBAY3JlZGVudGlhbHMsIEBjcmVkZW50aWFsUHJvdmlkZXIsIEBsb2dnZXJcbiAgICB9ID0gb3B0aW9uc1xuXG4gICAgdW5sZXNzIEBhY2Nlc3NLZXlJZFxuICAgICAgdGhyb3cgbmV3IEVycm9yIFwiYWNjZXNzS2V5SWQgaXMgcmVxdWlyZWRcIlxuXG4gICAgdW5sZXNzIEBzZWNyZXRBY2Nlc3NLZXlcbiAgICAgIHRocm93IG5ldyBFcnJvciBcInNlY3JldEFjY2Vzc0tleSBpcyByZXF1aXJlZFwiXG5cbiAgICB1bmxlc3MgQHJlZ2lvblxuICAgICAgdGhyb3cgbmV3IEVycm9yIFwicmVnaW9uIGlzIHJlcXVpcmVkXCJcblxuICAgIHVubGVzcyBfLmlzU3RyaW5nIEBhY2Nlc3NLZXlJZFxuICAgICAgdGhyb3cgbmV3IEVycm9yIFwiYWNjZXNzS2V5SWQgbXVzdCBiZSBhIHN0cmluZ1wiXG5cbiAgICB1bmxlc3MgXy5pc1N0cmluZyBAc2VjcmV0QWNjZXNzS2V5XG4gICAgICB0aHJvdyBuZXcgRXJyb3IgXCJzZWNyZXRBY2Nlc3NLZXkgbXVzdCBiZSBhIHN0cmluZ1wiXG5cbiAgICB1bmxlc3MgXy5pc1N0cmluZyBAcmVnaW9uXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgXCJyZWdpb24gbXVzdCBiZSBhIHN0cmluZ1wiXG5cbiAgICBpZiBAc2lnbmF0dXJlVmVyc2lvbiBhbmQgbm90IF8uaXNTdHJpbmcgQHNpZ25hdHVyZVZlcnNpb25cbiAgICAgIHRocm93IG5ldyBFcnJvciBcInNpZ25hdHVyZVZlcnNpb24gbXVzdCBiZSBhIHN0cmluZ1wiXG5cbiAgICBpZiBAbWF4UmV0cmllcyBhbmQgbm90IF8uaXNJbnRlZ2VyIEBtYXhSZXRyaWVzXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ21heFJldHJpZXMgbXVzdCBiZSBhIGludGVnZXInXG5cbiAgICBpZiBAbWF4UmVkaXJlY3RzIGFuZCBub3QgXy5pc0ludGVnZXIgQG1heFJlZGlyZWN0c1xuICAgICAgdGhyb3cgbmV3IEVycm9yICdtYXhSZWRpcmVjdHMgbXVzdCBiZSBhIGludGVnZXInXG5cbiAgICBpZiBAc3lzdGVtQ2xvY2tPZmZzZXQgYW5kIG5vdCBfLmlzTnVtYmVyIEBzeXN0ZW1DbG9ja09mZnNldFxuICAgICAgdGhyb3cgbmV3IEVycm9yICdzeXN0ZW1DbG9ja09mZnNldCBtdXN0IGJlIGEgbnVtYmVyJ1xuXG4gICAgaWYgQHNzbEVuYWJsZWQgYW5kIG5vdCBfLmlzQm9vbGVhbiBAc3NsRW5hYmxlZFxuICAgICAgdGhyb3cgbmV3IEVycm9yICdzc2xFbmFibGVkIG11c3QgYmUgYSBib29sZWFuJ1xuXG4gICAgaWYgQHBhcmFtVmFsaWRhdGlvbiBhbmQgbm90IF8uaXNCb29sZWFuIEBwYXJhbVZhbGlkYXRpb25cbiAgICAgIHRocm93IG5ldyBFcnJvciAncGFyYW1WYWxpZGF0aW9uIG11c3QgYmUgYSBib29sZWFuJ1xuXG4gICAgaWYgQGNvbXB1dGVDaGVja3N1bXMgYW5kIG5vdCBfLmlzQm9vbGVhbiBAY29tcHV0ZUNoZWNrc3Vtc1xuICAgICAgdGhyb3cgbmV3IEVycm9yICdjb21wdXRlQ2hlY2tzdW1zIG11c3QgYmUgYSBib29sZWFuJ1xuXG4gICAgaWYgQGNvbnZlcnRSZXNwb25zZVR5cGVzIGFuZCBub3QgXy5pc0Jvb2xlYW4gQGNvbnZlcnRSZXNwb25zZVR5cGVzXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ2NvbnZlcnRSZXNwb25zZVR5cGVzIG11c3QgYmUgYSBib29sZWFuJ1xuXG4gICAgaWYgQHMzRm9yY2VQYXRoU3R5bGUgYW5kIG5vdCBfLmlzQm9vbGVhbiBAczNGb3JjZVBhdGhTdHlsZVxuICAgICAgdGhyb3cgbmV3IEVycm9yICdzM0ZvcmNlUGF0aFN0eWxlIG11c3QgYmUgYSBib29sZWFuJ1xuXG4gICAgaWYgQHMzQnVja2V0RW5kcG9pbnQgYW5kIG5vdCBfLmlzQm9vbGVhbiBAczNCdWNrZXRFbmRwb2ludFxuICAgICAgdGhyb3cgbmV3IEVycm9yICdzM0J1Y2tldEVuZHBvaW50IG11c3QgYmUgYSBib29sZWFuJ1xuXG4gICAgaWYgQGh0dHBPcHRpb25zIGFuZCBub3QgXy5pc1BsYWluT2JqZWN0IEBodHRwT3B0aW9uc1xuICAgICAgdGhyb3cgbmV3IEVycm9yICdodHRwT3B0aW9ucyBtdXN0IGJlIGEgZGljdCB3aXRoIHBhcmFtczogcHJveHksIGFnZW50LCB0aW1lb3V0LCB4aHJBc3luYywgeGhyV2l0aENyZWRlbnRpYWxzJ1xuXG4gICAgaWYgQGFwaVZlcnNpb25zIGFuZCBub3QgXy5pc1BsYWluT2JqZWN0IEBhcGlWZXJzaW9uc1xuICAgICAgdGhyb3cgbmV3IEVycm9yICdhcGlWZXJzaW9ucyBtdXN0IGJlIGEgZGljdCB3aXRoIHZlcnNpb25zJ1xuXG4gICAgaWYgQGFwaVZlcnNpb24gYW5kIG5vdCAoXy5pc1N0cmluZyBAYXBpVmVyc2lvbiBvciBfLmlzRGF0ZSBAYXBpVmVyc2lvbilcbiAgICAgIHRocm93IG5ldyBFcnJvciAnYXBpVmVyc2lvbiBtdXN0IGJlIGEgc3RyaW5nIG9yIGRhdGUnXG5cbiAgICBpZiBAc2Vzc2lvblRva2VuIGFuZCBub3QgQHNlc3Npb25Ub2tlbiBpbnN0YW5jZW9mIGF3cy5DcmVkZW50aWFsc1xuICAgICAgdGhyb3cgbmV3IEVycm9yICdzZXNzaW9uVG9rZW4gbXVzdCBiZSBhIEFXUy5DcmVkZW50aWFscydcblxuICAgIGlmIEBjcmVkZW50aWFscyBhbmQgbm90IEBjcmVkZW50aWFscyBpbnN0YW5jZW9mIGF3cy5DcmVkZW50aWFsc1xuICAgICAgdGhyb3cgbmV3IEVycm9yICdjcmVkZW50aWFscyBtdXN0IGJlIGEgQVdTLkNyZWRlbnRpYWxzJ1xuXG4gICAgaWYgQGNyZWRlbnRpYWxQcm92aWRlciBhbmQgbm90IEBjcmVkZW50aWFsUHJvdmlkZXIgaW5zdGFuY2VvZiBhd3MuQ3JlZGVudGlhbHNQcm92aWRlckNoYWluXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ2NyZWRlbnRpYWxQcm92aWRlciBtdXN0IGJlIGEgQVdTLkNyZWRlbnRpYWxzUHJvdmlkZXJDaGFpbidcblxuICAgIGlmIEBsb2dnZXIgYW5kIG5vdCAoQGxvZ2dlci53cml0ZSBhbmQgQGxvZ2dlci5sb2cpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ2xvZ2dlciBtdXN0IGhhdmUgI3dyaXRlIG9yICNsb2cgbWV0aG9kcydcblxuXG4jIEV4cG9ydHNcbm1vZHVsZS5leHBvcnRzID0gUzNDbGllbnRcblxuIl19
