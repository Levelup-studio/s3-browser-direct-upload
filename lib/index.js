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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGliL2luZGV4LmpzIiwic291cmNlcyI6WyJsaWIvaW5kZXguY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLElBQUEsaUNBQUE7RUFBQTs7QUFBQSxDQUFBLEdBQVUsT0FBQSxDQUFRLFFBQVI7O0FBQ1YsSUFBQSxHQUFVLE9BQUEsQ0FBUSxNQUFSOztBQUNWLE1BQUEsR0FBVSxPQUFBLENBQVEsUUFBUjs7QUFDVixNQUFBLEdBQVUsT0FBQSxDQUFRLFFBQVI7O0FBR0o7RUFDUyxrQkFBQyxPQUFELEVBQWUsd0JBQWY7QUFDWCxRQUFBOztNQURZLFVBQVU7O0lBQ3RCLEdBQUEsR0FBTSxPQUFBLENBQVEsU0FBUjtJQUVOLElBQUEsQ0FBQSxDQUE4QixPQUFBLFlBQW1CLEdBQUcsQ0FBQyxNQUFyRCxDQUFBO01BQUEsSUFBQyxDQUFBLGFBQUQsQ0FBZSxPQUFmLEVBQUE7O0lBQ0EsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFYLENBQWtCLE9BQWxCO0lBRUEsSUFBQyxDQUFBLEVBQUQsR0FBTSxJQUFJLEdBQUcsQ0FBQyxFQUFSLENBQUE7SUFFTixJQUFDLENBQUEsd0JBQUQsR0FBNEI7SUFDNUIsSUFBRyx3QkFBQSxJQUE2QixJQUFDLENBQUEsMkJBQUQsQ0FBNkIsd0JBQTdCLENBQWhDO01BQ0UsSUFBQyxDQUFBLHdCQUFELEdBQTRCLHlCQUQ5Qjs7RUFUVzs7cUJBY2IsY0FBQSxHQUFnQixTQUFDLE9BQUQsRUFBZSxFQUFmO0FBQ2QsUUFBQTs7TUFEZSxVQUFVOztJQUN6QixJQUFBLENBQThDLEVBQTlDO0FBQUEsWUFBTSxJQUFJLEtBQUosQ0FBVSxzQkFBVixFQUFOOztJQUNFLDZCQUFGLEVBQWEsaUJBQWIsRUFBa0IsdUJBQWxCLEVBQTBCLHlCQUExQixFQUFtQyxpQkFBbkMsRUFBd0MscUNBQXhDLEVBQXVELDZCQUF2RCxFQUFrRSx1QkFBbEUsRUFBMEUsMkNBQTFFLEVBQTRGO0lBQzVGLEdBQUEsR0FBTSxPQUFPLENBQUM7SUFDZCxNQUFB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RyxJQUFDLENBQUEsVUFBRCxJQUFnQixDQUFJLENBQUMsQ0FBQyxDQUFDLFFBQUYsQ0FBVyxJQUFDLENBQUEsVUFBRCxJQUFlLENBQUMsQ0FBQyxNQUFGLENBQVMsSUFBQyxDQUFBLFVBQVYsQ0FBMUIsQ0FBRCxDQUF2QjtBQUNFLFlBQU0sSUFBSSxLQUFKLENBQVUscUNBQVYsRUFEUjs7SUFHQSxJQUFHLElBQUMsQ0FBQSxZQUFELElBQWtCLENBQUksSUFBQyxDQUFBLFlBQUwsWUFBNkIsR0FBRyxDQUFDLFdBQXREO0FBQ0UsWUFBTSxJQUFJLEtBQUosQ0FBVSx3Q0FBVixFQURSOztJQUdBLElBQUcsSUFBQyxDQUFBLFdBQUQsSUFBaUIsQ0FBSSxJQUFDLENBQUEsV0FBTCxZQUE0QixHQUFHLENBQUMsV0FBcEQ7QUFDRSxZQUFNLElBQUksS0FBSixDQUFVLHVDQUFWLEVBRFI7O0lBR0EsSUFBRyxJQUFDLENBQUEsa0JBQUQsSUFBd0IsQ0FBSSxJQUFDLENBQUEsa0JBQUwsWUFBbUMsR0FBRyxDQUFDLHdCQUFsRTtBQUNFLFlBQU0sSUFBSSxLQUFKLENBQVUsMkRBQVYsRUFEUjs7SUFHQSxJQUFHLElBQUMsQ0FBQSxNQUFELElBQVksQ0FBSSxDQUFDLElBQUMsQ0FBQSxNQUFNLENBQUMsS0FBUixJQUFrQixJQUFDLENBQUEsTUFBTSxDQUFDLEdBQTNCLENBQW5CO0FBQ0UsWUFBTSxJQUFJLEtBQUosQ0FBVSx5Q0FBVixFQURSOztFQXpFYTs7Ozs7O0FBOEVqQixNQUFNLENBQUMsT0FBUCxHQUFpQiIsInNvdXJjZXNDb250ZW50IjpbIiMgczMtYnJvd3Nlci1kaXJlY3QtdXBsb2FkXG5fICAgICAgID0gcmVxdWlyZSgnbG9kYXNoJylcbm1pbWUgICAgPSByZXF1aXJlKCdtaW1lJylcbm1vbWVudCAgPSByZXF1aXJlKCdtb21lbnQnKVxuY3J5cHRvICA9IHJlcXVpcmUoJ2NyeXB0bycpXG5cblxuY2xhc3MgUzNDbGllbnRcbiAgY29uc3RydWN0b3I6IChvcHRpb25zID0ge30sIGFyckFsbG93ZWREYXRhRXh0ZW5zaW9ucykgLT5cbiAgICBhd3MgPSByZXF1aXJlKCdhd3Mtc2RrJylcblxuICAgIEBfY2hlY2tPcHRpb25zIG9wdGlvbnMgdW5sZXNzIG9wdGlvbnMgaW5zdGFuY2VvZiBhd3MuQ29uZmlnXG4gICAgYXdzLmNvbmZpZy51cGRhdGUgb3B0aW9uc1xuXG4gICAgQHMzID0gbmV3IGF3cy5TMygpXG5cbiAgICBAYXJyQWxsb3dlZERhdGFFeHRlbnNpb25zID0gbnVsbFxuICAgIGlmIGFyckFsbG93ZWREYXRhRXh0ZW5zaW9ucyBhbmQgQF9jaGVja0FsbG93ZWREYXRhRXh0ZW5zaW9ucyBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnNcbiAgICAgIEBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnMgPSBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnNcblxuXG4gICMgQnJvd3NlciBmb3JtIHBvc3QgcGFyYW1zIGZvciB1cGxvYWRpbmdcbiAgdXBsb2FkUG9zdEZvcm06IChvcHRpb25zID0ge30sIGNiKSAtPlxuICAgIHRocm93IG5ldyBFcnJvciAnQ2FsbGJhY2sgaXMgcmVxdWlyZWQnIHVubGVzcyBjYlxuICAgIHsgZXh0ZW5zaW9uLCBrZXksIGJ1Y2tldCwgZXhwaXJlcywgYWNsLCBjb250ZW50TGVuZ3RoLCBhbGdvcml0aG0sIHJlZ2lvbiwgczNGb3JjZVBhdGhTdHlsZSwgY29uZGl0aW9uTWF0Y2hpbmcgfSA9IG9wdGlvbnNcbiAgICBrZXkgPSBvcHRpb25zLmtleVxuICAgIGJ1Y2tldCA9IG9wdGlvbnMuYnVja2V0XG4gICAgcmVnaW9uID0gb3B0aW9ucy5yZWdpb25cbiAgICBleHRlbnNpb24gPSBvcHRpb25zLmV4dGVuc2lvbiA/IG51bGxcbiAgICBleHBpcmVzID0gb3B0aW9ucy5leHBpcmVzID8gbW9tZW50LnV0YygpLmFkZCg2MCwgJ21pbnV0ZXMnKS50b0RhdGUoKVxuICAgIGFjbCA9IG9wdGlvbnMuYWNsID8gJ3B1YmxpYy1yZWFkJ1xuICAgIGNvbnRlbnRMZW5ndGggPSBvcHRpb25zLmNvbnRlbnRMZW5ndGggPyBudWxsXG4gICAgYWxnb3JpdGhtID0gb3B0aW9ucy5hbGdvcml0aG0gPyAnQVdTNC1ITUFDLVNIQTI1NidcbiAgICByZWdpb24gPSBvcHRpb25zLnJlZ2lvbiA/IEByZWdpb25cbiAgICBjb25kaXRpb25NYXRjaGluZyA9IG9wdGlvbnMuY29uZGl0aW9uTWF0Y2hpbmcgPyBudWxsXG4gICAgY2FjaGVDb250cm9sID0gb3B0aW9ucy5jYWNoZUNvbnRyb2wgPyBudWxsXG4gICAgY29udGVudERpc3Bvc2l0aW9uID0gb3B0aW9ucy5jb250ZW50RGlzcG9zaXRpb24gPyBudWxsXG4gICAgIyBAVE9ETyBvcHRpb25zIHR5cGUgY2hlY2tcbiAgICB1bmxlc3Mga2V5IGFuZCBidWNrZXRcbiAgICAgIHJldHVybiBjYiBuZXcgRXJyb3IgJ2tleSBhbmQgYnVja2V0IGFyZSByZXF1aXJlZCdcblxuICAgIGlmIGV4dGVuc2lvblxuICAgICAgY29udGVudFR5cGUgPSBAX2NoZWNrRGF0YUV4dGVuc2lvbiBleHRlbnNpb25cbiAgICAgIHJldHVybiBjYiBuZXcgRXJyb3IgJ0RhdGEgZXh0ZW5zaW9uIG5vdCBhbGxvd2VkJyB1bmxlc3MgY29udGVudFR5cGVcblxuICAgIGlmIGFsZ29yaXRobS5zcGxpdCgnLScpLmxlbmd0aCA9PSAzXG4gICAgICBhcnJBbGdvcml0aG0gPSBhbGdvcml0aG0uc3BsaXQoJy0nKVxuICAgICAgc2lndmVyID0gYXJyQWxnb3JpdGhtWzBdXG4gICAgICBoYXNoYWxnID0gYXJyQWxnb3JpdGhtWzJdLnRvTG93ZXJDYXNlKClcbiAgICBlbHNlXG4gICAgICBzaWd2ZXIgPSBcIkFXUzRcIlxuICAgICAgaGFzaGFsZyA9IFwic2hhMjU2XCJcblxuICAgIHBvbGljeURvYyA9IHt9XG5cbiAgICBwb2xpY3lEb2NbXCJleHBpcmF0aW9uXCJdID0gbW9tZW50LnV0YyhleHBpcmVzKS5mb3JtYXQoXCJZWVlZLU1NLUREW1RdSEg6TU06U1NbWl1cIikgaWYgZXhwaXJlcyBhbmQgXy5pc0RhdGUgZXhwaXJlc1xuICAgIHBvbGljeURvY1tcImNvbmRpdGlvbnNcIl0gPSBbXVxuXG4gICAgZGF0ZVNob3J0UG9saWN5ID0gbW9tZW50LnV0YygpLmZvcm1hdCgnWVlZWU1NREQnKVxuICAgIGRhdGVMb25nUG9saWN5ID0gbW9tZW50LnV0YygpLmZvcm1hdCgnWVlZWU1NRERbVF1ISE1NU1NbWl0nKVxuXG4gICAgcG9saWN5RG9jLmNvbmRpdGlvbnMucHVzaCB7ICdidWNrZXQnOiBidWNrZXQgfVxuICAgIHBvbGljeURvYy5jb25kaXRpb25zLnB1c2ggWyAnc3RhcnRzLXdpdGgnLCAnJGtleScsIGtleSBdXG4gICAgcG9saWN5RG9jLmNvbmRpdGlvbnMucHVzaCB7ICdhY2wnOiBhY2wgfVxuICAgIHBvbGljeURvYy5jb25kaXRpb25zLnB1c2ggeyAnY2FjaGUtY29udHJvbCc6IGNhY2hlQ29udHJvbCB9IGlmIGNhY2hlQ29udHJvbFxuICAgIHBvbGljeURvYy5jb25kaXRpb25zLnB1c2ggWyAnc3RhcnRzLXdpdGgnLCAnJENvbnRlbnQtRGlzcG9zaXRpb24nLCAnJyBdIGlmIGNvbnRlbnREaXNwb3NpdGlvblxuICAgIHBvbGljeURvYy5jb25kaXRpb25zLnB1c2ggWyAnc3RhcnRzLXdpdGgnLCAnJENvbnRlbnQtVHlwZScsICcnIF0gaWYgY29udGVudFR5cGVcbiAgICBwb2xpY3lEb2MuY29uZGl0aW9ucy5wdXNoIFsgJ2NvbnRlbnQtbGVuZ3RoLXJhbmdlJywgMCwgY29udGVudExlbmd0aCBdIGlmIGNvbnRlbnRMZW5ndGhcbiAgICBwb2xpY3lEb2MuY29uZGl0aW9ucy5wdXNoIHsgXCJ4LWFtei1hbGdvcml0aG1cIjogYWxnb3JpdGhtIH1cbiAgICBwb2xpY3lEb2MuY29uZGl0aW9ucy5wdXNoIHsgXCJ4LWFtei1jcmVkZW50aWFsXCI6IFwiI3tAYWNjZXNzS2V5SWR9LyN7ZGF0ZVNob3J0UG9saWN5fS8je3JlZ2lvbn0vczMvYXdzNF9yZXF1ZXN0XCIgfVxuICAgIHBvbGljeURvYy5jb25kaXRpb25zLnB1c2ggeyBcIngtYW16LWRhdGVcIjogZGF0ZUxvbmdQb2xpY3l9XG5cbiAgICBpZiBjb25kaXRpb25NYXRjaGluZyBhbmQgXy5pc0FycmF5IGNvbmRpdGlvbk1hdGNoaW5nXG4gICAgICBwb2xpY3lEb2MuY29uZGl0aW9ucyA9IF8udW5pb24gY29uZGl0aW9uTWF0Y2hpbmcsIHBvbGljeURvYy5jb25kaXRpb25zXG5cbiAgICBkYXRlS2V5ID0gY3J5cHRvLmNyZWF0ZUhtYWMoaGFzaGFsZywgXCIje3NpZ3Zlcn0je0BzZWNyZXRBY2Nlc3NLZXl9XCIpLnVwZGF0ZShkYXRlU2hvcnRQb2xpY3kpLmRpZ2VzdCgpXG4gICAgZGF0ZVJlZ2lvbktleSA9IGNyeXB0by5jcmVhdGVIbWFjKGhhc2hhbGcsIGRhdGVLZXkpLnVwZGF0ZShyZWdpb24pLmRpZ2VzdCgpXG4gICAgZGF0ZVJlZ2lvblNlcnZpY2VLZXkgPSBjcnlwdG8uY3JlYXRlSG1hYyhoYXNoYWxnLCBkYXRlUmVnaW9uS2V5KS51cGRhdGUoJ3MzJykuZGlnZXN0KClcbiAgICBzaWduaW5nS2V5ID0gY3J5cHRvLmNyZWF0ZUhtYWMoaGFzaGFsZywgZGF0ZVJlZ2lvblNlcnZpY2VLZXkpLnVwZGF0ZShcIiN7c2lndmVyLnRvTG93ZXJDYXNlKCl9X3JlcXVlc3RcIikuZGlnZXN0KClcbiAgICBwb2xpY3kgPSBuZXcgQnVmZmVyKEpTT04uc3RyaW5naWZ5KHBvbGljeURvYykpLnRvU3RyaW5nKCdiYXNlNjQnKVxuICAgIHNpZ25hdHVyZSA9IGNyeXB0by5jcmVhdGVIbWFjKGhhc2hhbGcsc2lnbmluZ0tleSkudXBkYXRlKHBvbGljeSkuZGlnZXN0KCdoZXgnKVxuXG4gICAgc3RyZWFtID0ge31cbiAgICBzdHJlYW1bJ3BhcmFtcyddID1cbiAgICAgIFwia2V5XCI6IGtleVxuICAgICAgXCJhY2xcIjogYWNsXG4gICAgICBcIngtYW16LWFsZ29yaXRobVwiOiBhbGdvcml0aG1cbiAgICAgIFwieC1hbXotY3JlZGVudGlhbFwiOiBcIiN7QGFjY2Vzc0tleUlkfS8je2RhdGVTaG9ydFBvbGljeX0vI3tyZWdpb259L3MzLyN7c2lndmVyLnRvTG93ZXJDYXNlKCl9X3JlcXVlc3RcIlxuICAgICAgXCJ4LWFtei1kYXRlXCI6IGRhdGVMb25nUG9saWN5XG4gICAgICBcInBvbGljeVwiOiBwb2xpY3lcbiAgICAgIFwieC1hbXotc2lnbmF0dXJlXCI6IHNpZ25hdHVyZVxuICAgIHN0cmVhbS5wYXJhbXNbJ2NvbnRlbnQtdHlwZSddID0gY29udGVudFR5cGUgaWYgY29udGVudFR5cGVcbiAgICBzdHJlYW0ucGFyYW1zWydjYWNoZS1jb250cm9sJ10gPSBjYWNoZUNvbnRyb2wgaWYgY2FjaGVDb250cm9sXG4gICAgc3RyZWFtLnBhcmFtc1snY29udGVudC1kaXNwb3NpdGlvbiddID0gY29udGVudERpc3Bvc2l0aW9uIGlmIGNvbnRlbnREaXNwb3NpdGlvblxuICAgIHN0cmVhbVsnY29uZGl0aW9ucyddICA9IGNvbmRpdGlvbk1hdGNoaW5nIGlmIGNvbmRpdGlvbk1hdGNoaW5nXG4gICAgaWYgdGhpcy5zM0ZvcmNlUGF0aFN0eWxlXG4gICAgICBzdHJlYW1bJ3B1YmxpY191cmwnXSAgPSBcImh0dHBzOi8vczMtI3tyZWdpb259LmFtYXpvbmF3cy5jb20vI3tidWNrZXR9LyN7a2V5fVwiXG4gICAgICBzdHJlYW1bJ2Zvcm1fdXJsJ10gICAgPSBcImh0dHBzOi8vczMtI3tyZWdpb259LmFtYXpvbmF3cy5jb20vI3tidWNrZXR9L1wiXG4gICAgZWxzZVxuICAgICAgc3RyZWFtWydwdWJsaWNfdXJsJ10gID0gXCJodHRwczovLyN7YnVja2V0fS5zMy5hbWF6b25hd3MuY29tLyN7a2V5fVwiXG4gICAgICBzdHJlYW1bJ2Zvcm1fdXJsJ10gICAgPSBcImh0dHBzOi8vI3tidWNrZXR9LnMzLmFtYXpvbmF3cy5jb20vXCJcbiAgICBjYiBudWxsLCBzdHJlYW1cblxuXG4gICMgUzMudXBsb2FkXG4gIHVwbG9hZDogKG9wdGlvbnMgPSB7fSwgY2IpIC0+XG4gICAgdGhyb3cgbmV3IEVycm9yICdDYWxsYmFjayBpcyByZXF1aXJlZCcgdW5sZXNzIGNiXG4gICAgeyBkYXRhLCBleHRlbnNpb24sIGtleSwgYnVja2V0LCBleHBpcmVzLCBhY2wsIGNvbnRlbnRMZW5ndGggfSA9IG9wdGlvbnNcbiAgICBkYXRhID0gb3B0aW9ucy5kYXRhXG4gICAga2V5ID0gb3B0aW9ucy5rZXlcbiAgICBidWNrZXQgPSBvcHRpb25zLmJ1Y2tldFxuICAgIGV4dGVuc2lvbiA9IG9wdGlvbnMuZXh0ZW5zaW9uID8gbnVsbFxuICAgIGV4cGlyZXMgPSBvcHRpb25zLmV4cGlyZXMgPyBudWxsXG4gICAgYWNsID0gb3B0aW9ucy5hY2wgPyBudWxsXG4gICAgY29udGVudExlbmd0aCA9IG9wdGlvbnMuY29udGVudExlbmd0aCA/IG51bGxcbiAgICBjb250ZW50RGlzcG9zaXRpb24gPSBvcHRpb25zLmNvbnRlbnREaXNwb3NpdGlvbiA/IG51bGxcbiAgICBcbiAgICAjIEBUT0RPIG9wdGlvbnMgdHlwZSBjaGVja1xuICAgIHVubGVzcyBkYXRhIGFuZCBrZXkgYW5kIGJ1Y2tldFxuICAgICAgcmV0dXJuIGNiIG5ldyBFcnJvciAnZGF0YSwga2V5IGFuZCBidWNrZXQgYXJlIHJlcXVpcmVkJ1xuXG4gICAgcGFyYW1zID1cbiAgICAgIEJ1Y2tldDogYnVja2V0XG4gICAgICBLZXk6IGtleVxuICAgICAgQm9keTogZGF0YVxuXG4gICAgaWYgZXh0ZW5zaW9uXG4gICAgICBjb250ZW50VHlwZSA9IEBfY2hlY2tEYXRhRXh0ZW5zaW9uIGV4dGVuc2lvblxuICAgICAgcmV0dXJuIGNiIG5ldyBFcnJvciAnRGF0YSBleHRlbnNpb24gbm90IGFsbG93ZWQnIHVubGVzcyBjb250ZW50VHlwZVxuICAgICAgcGFyYW1zW1wiQ29udGVudFR5cGVcIl0gPSBjb250ZW50VHlwZVxuXG4gICAgcGFyYW1zW1wiQ2FjaGUtQ29udHJvbFwiXSA9IGNhY2hlQ29udHJvbCBpZiBjYWNoZUNvbnRyb2xcbiAgICBwYXJhbXNbXCJDb250ZW50LURpc3Bvc2l0aW9uXCJdID0gY29udGVudERpc3Bvc2l0aW9uIGlmIGNvbnRlbnREaXNwb3NpdGlvblxuICAgIHBhcmFtc1tcIkV4cGlyZXNcIl0gPSBtb21lbnQudXRjKGV4cGlyZXMpIGlmIGV4cGlyZXMgYW5kIF8uaXNEYXRlIGV4cGlyZXNcbiAgICBwYXJhbXNbXCJBQ0xcIl0gPSBhY2wgaWYgYWNsXG4gICAgcGFyYW1zW1wiQ29udGVudExlbmd0aFwiXSA9IGNvbnRlbnRMZW5ndGggaWYgY29udGVudExlbmd0aFxuXG4gICAgQHMzLnVwbG9hZCBwYXJhbXMsIChlcnIsIGRhdGEpIC0+XG4gICAgICByZXR1cm4gY2IgZXJyIGlmIGVyclxuICAgICAgY2IgbnVsbCwgXCJodHRwczovLyN7YnVja2V0fS5zMy5hbWF6b25hd3MuY29tLyN7a2V5fVwiXG5cblxuICAjIFMzLnB1dE9iamVjdFxuICBwdXQ6IChvcHRpb25zID0ge30sIGNiKSAtPlxuICAgIHRocm93IG5ldyBFcnJvciAnQ2FsbGJhY2sgaXMgcmVxdWlyZWQnIHVubGVzcyBjYlxuICAgIHsgZXh0ZW5zaW9uLCBrZXksIGJ1Y2tldCwgZXhwaXJlcywgYWNsLCBjb250ZW50TGVuZ3RoIH0gPSBvcHRpb25zXG4gICAga2V5ID0gb3B0aW9ucy5rZXlcbiAgICBidWNrZXQgPSBvcHRpb25zLmJ1Y2tldFxuICAgIGV4dGVuc2lvbiA9IG9wdGlvbnMuZXh0ZW5zaW9uID8gbnVsbFxuICAgIGV4cGlyZXMgPSBvcHRpb25zLmV4cGlyZXMgPyBudWxsXG4gICAgYWNsID0gb3B0aW9ucy5hY2wgPyBudWxsXG5cbiAgICAjIEBUT0RPIG9wdGlvbnMgdHlwZSBjaGVja1xuICAgIHVubGVzcyBrZXkgYW5kIGJ1Y2tldFxuICAgICAgcmV0dXJuIGNiIG5ldyBFcnJvciAna2V5IGFuZCBidWNrZXQgYXJlIHJlcXVpcmVkJ1xuXG4gICAgcGFyYW1zID1cbiAgICAgIEJ1Y2tldDogYnVja2V0XG4gICAgICBLZXk6IGtleVxuXG4gICAgaWYgZXh0ZW5zaW9uXG4gICAgICBjb250ZW50VHlwZSA9IEBfY2hlY2tEYXRhRXh0ZW5zaW9uIGV4dGVuc2lvblxuICAgICAgcmV0dXJuIGNiIG5ldyBFcnJvciAnRGF0YSBleHRlbnNpb24gbm90IGFsbG93ZWQnIHVubGVzcyBjb250ZW50VHlwZVxuICAgICAgcGFyYW1zW1wiQ29udGVudFR5cGVcIl0gPSBjb250ZW50VHlwZVxuXG4gICAgcGFyYW1zW1wiQ2FjaGUtQ29udHJvbFwiXSA9IFwibWF4LWFnZT0zMTUzNjAwMCwgaW1tdXRhYmxlXCJcbiAgICBwYXJhbXNbXCJFeHBpcmVzXCJdID0gbW9tZW50LnV0YyhleHBpcmVzKSBpZiBleHBpcmVzIGFuZCBfLmlzRGF0ZSBleHBpcmVzXG4gICAgcGFyYW1zW1wiQUNMXCJdID0gYWNsIGlmIGFjbFxuXG4gICAgQHMzLmdldFNpZ25lZFVybCBcInB1dE9iamVjdFwiLCBwYXJhbXMsIChlcnIsIGRhdGEpIC0+XG4gICAgICByZXR1cm4gY2IgZXJyIGlmIGVyclxuXG4gICAgICBwdXQgPVxuICAgICAgICAnc2lnbmVkX3VybCc6IGRhdGFcbiAgICAgICAgJ3B1YmxpY191cmwnOiBcImh0dHBzOi8vI3tidWNrZXR9LnMzLmFtYXpvbmF3cy5jb20vI3trZXl9XCJcblxuICAgICAgY2IgbnVsbCwgcHV0XG5cblxuICAjIENoZWNrIGRhdGEgdHlwZSBmcm9tIGFyckFsbG93ZWREYXRhRXh0ZW5zaW9uc1xuICBfY2hlY2tEYXRhRXh0ZW5zaW9uOiAoZGF0YUV4dGVuc2lvbikgLT5cbiAgICByZXR1cm4gZmFsc2UgaWYgbm90IGRhdGFFeHRlbnNpb24gb3IgKEBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnMgYW5kIGRhdGFFeHRlbnNpb24gbm90IGluIEBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnMpXG4gICAgcmV0dXJuIG1pbWUubG9va3VwIGRhdGFFeHRlbnNpb25cblxuXG4gICMgQ2hlY2sgYWxsb3dlZCBkYXRhIHR5cGVzXG4gIF9jaGVja0FsbG93ZWREYXRhRXh0ZW5zaW9uczogKGFyckFsbG93ZWREYXRhRXh0ZW5zaW9ucykgLT5cbiAgICByZXR1cm4gZmFsc2UgdW5sZXNzIGFyckFsbG93ZWREYXRhRXh0ZW5zaW9uc1xuXG4gICAgdW5sZXNzIF8uaXNBcnJheSBhcnJBbGxvd2VkRGF0YUV4dGVuc2lvbnNcbiAgICAgIHRocm93IG5ldyBFcnJvciBcIkFsbG93ZWQgZGF0YSBleHRlbnNpb25zIG11c3QgYmUgYXJyYXkgb2Ygc3RyaW5nc1wiXG5cbiAgICBmb3IgZXh0IG9mIGFyckFsbG93ZWREYXRhRXh0ZW5zaW9uc1xuICAgICAgdW5sZXNzIF8uaXNTdHJpbmcgZXh0XG4gICAgICAgIHRocm93IG5ldyBFcnJvciBcIkV4dGVuc2lvbnMgbXVzdCBiZSBhIHN0cmluZ3NcIlxuXG4gICAgcmV0dXJuIHRydWVcblxuXG4gICMgQ2hlY2sgb3B0aW9ucyBwYXJhbXNcbiAgX2NoZWNrT3B0aW9uczogKG9wdGlvbnMgPSB7fSkgLT5cbiAgICB7XG4gICAgICBAYWNjZXNzS2V5SWQsIEBzZWNyZXRBY2Nlc3NLZXksIEByZWdpb24sIEBzaWduYXR1cmVWZXJzaW9uLCBAbWF4UmV0cmllcywgQG1heFJlZGlyZWN0cywgQHN5c3RlbUNsb2NrT2Zmc2V0LFxuICAgICAgQHNzbEVuYWJsZWQsIEBwYXJhbVZhbGlkYXRpb24sIEBjb21wdXRlQ2hlY2tzdW1zLCBAY29udmVydFJlc3BvbnNlVHlwZXMsIEBzM0ZvcmNlUGF0aFN0eWxlLCBAczNCdWNrZXRFbmRwb2ludCxcbiAgICAgIEBhcGlWZXJzaW9uLCBAaHR0cE9wdGlvbnMsIEBhcGlWZXJzaW9ucywgQHNlc3Npb25Ub2tlbiwgQGNyZWRlbnRpYWxzLCBAY3JlZGVudGlhbFByb3ZpZGVyLCBAbG9nZ2VyXG4gICAgfSA9IG9wdGlvbnNcblxuICAgIHVubGVzcyBAYWNjZXNzS2V5SWRcbiAgICAgIHRocm93IG5ldyBFcnJvciBcImFjY2Vzc0tleUlkIGlzIHJlcXVpcmVkXCJcblxuICAgIHVubGVzcyBAc2VjcmV0QWNjZXNzS2V5XG4gICAgICB0aHJvdyBuZXcgRXJyb3IgXCJzZWNyZXRBY2Nlc3NLZXkgaXMgcmVxdWlyZWRcIlxuXG4gICAgdW5sZXNzIEByZWdpb25cbiAgICAgIHRocm93IG5ldyBFcnJvciBcInJlZ2lvbiBpcyByZXF1aXJlZFwiXG5cbiAgICB1bmxlc3MgXy5pc1N0cmluZyBAYWNjZXNzS2V5SWRcbiAgICAgIHRocm93IG5ldyBFcnJvciBcImFjY2Vzc0tleUlkIG11c3QgYmUgYSBzdHJpbmdcIlxuXG4gICAgdW5sZXNzIF8uaXNTdHJpbmcgQHNlY3JldEFjY2Vzc0tleVxuICAgICAgdGhyb3cgbmV3IEVycm9yIFwic2VjcmV0QWNjZXNzS2V5IG11c3QgYmUgYSBzdHJpbmdcIlxuXG4gICAgdW5sZXNzIF8uaXNTdHJpbmcgQHJlZ2lvblxuICAgICAgdGhyb3cgbmV3IEVycm9yIFwicmVnaW9uIG11c3QgYmUgYSBzdHJpbmdcIlxuXG4gICAgaWYgQHNpZ25hdHVyZVZlcnNpb24gYW5kIG5vdCBfLmlzU3RyaW5nIEBzaWduYXR1cmVWZXJzaW9uXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgXCJzaWduYXR1cmVWZXJzaW9uIG11c3QgYmUgYSBzdHJpbmdcIlxuXG4gICAgaWYgQG1heFJldHJpZXMgYW5kIG5vdCBfLmlzSW50ZWdlciBAbWF4UmV0cmllc1xuICAgICAgdGhyb3cgbmV3IEVycm9yICdtYXhSZXRyaWVzIG11c3QgYmUgYSBpbnRlZ2VyJ1xuXG4gICAgaWYgQG1heFJlZGlyZWN0cyBhbmQgbm90IF8uaXNJbnRlZ2VyIEBtYXhSZWRpcmVjdHNcbiAgICAgIHRocm93IG5ldyBFcnJvciAnbWF4UmVkaXJlY3RzIG11c3QgYmUgYSBpbnRlZ2VyJ1xuXG4gICAgaWYgQHN5c3RlbUNsb2NrT2Zmc2V0IGFuZCBub3QgXy5pc051bWJlciBAc3lzdGVtQ2xvY2tPZmZzZXRcbiAgICAgIHRocm93IG5ldyBFcnJvciAnc3lzdGVtQ2xvY2tPZmZzZXQgbXVzdCBiZSBhIG51bWJlcidcblxuICAgIGlmIEBzc2xFbmFibGVkIGFuZCBub3QgXy5pc0Jvb2xlYW4gQHNzbEVuYWJsZWRcbiAgICAgIHRocm93IG5ldyBFcnJvciAnc3NsRW5hYmxlZCBtdXN0IGJlIGEgYm9vbGVhbidcblxuICAgIGlmIEBwYXJhbVZhbGlkYXRpb24gYW5kIG5vdCBfLmlzQm9vbGVhbiBAcGFyYW1WYWxpZGF0aW9uXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ3BhcmFtVmFsaWRhdGlvbiBtdXN0IGJlIGEgYm9vbGVhbidcblxuICAgIGlmIEBjb21wdXRlQ2hlY2tzdW1zIGFuZCBub3QgXy5pc0Jvb2xlYW4gQGNvbXB1dGVDaGVja3N1bXNcbiAgICAgIHRocm93IG5ldyBFcnJvciAnY29tcHV0ZUNoZWNrc3VtcyBtdXN0IGJlIGEgYm9vbGVhbidcblxuICAgIGlmIEBjb252ZXJ0UmVzcG9uc2VUeXBlcyBhbmQgbm90IF8uaXNCb29sZWFuIEBjb252ZXJ0UmVzcG9uc2VUeXBlc1xuICAgICAgdGhyb3cgbmV3IEVycm9yICdjb252ZXJ0UmVzcG9uc2VUeXBlcyBtdXN0IGJlIGEgYm9vbGVhbidcblxuICAgIGlmIEBzM0ZvcmNlUGF0aFN0eWxlIGFuZCBub3QgXy5pc0Jvb2xlYW4gQHMzRm9yY2VQYXRoU3R5bGVcbiAgICAgIHRocm93IG5ldyBFcnJvciAnczNGb3JjZVBhdGhTdHlsZSBtdXN0IGJlIGEgYm9vbGVhbidcblxuICAgIGlmIEBzM0J1Y2tldEVuZHBvaW50IGFuZCBub3QgXy5pc0Jvb2xlYW4gQHMzQnVja2V0RW5kcG9pbnRcbiAgICAgIHRocm93IG5ldyBFcnJvciAnczNCdWNrZXRFbmRwb2ludCBtdXN0IGJlIGEgYm9vbGVhbidcblxuICAgIGlmIEBodHRwT3B0aW9ucyBhbmQgbm90IF8uaXNQbGFpbk9iamVjdCBAaHR0cE9wdGlvbnNcbiAgICAgIHRocm93IG5ldyBFcnJvciAnaHR0cE9wdGlvbnMgbXVzdCBiZSBhIGRpY3Qgd2l0aCBwYXJhbXM6IHByb3h5LCBhZ2VudCwgdGltZW91dCwgeGhyQXN5bmMsIHhocldpdGhDcmVkZW50aWFscydcblxuICAgIGlmIEBhcGlWZXJzaW9ucyBhbmQgbm90IF8uaXNQbGFpbk9iamVjdCBAYXBpVmVyc2lvbnNcbiAgICAgIHRocm93IG5ldyBFcnJvciAnYXBpVmVyc2lvbnMgbXVzdCBiZSBhIGRpY3Qgd2l0aCB2ZXJzaW9ucydcblxuICAgIGlmIEBhcGlWZXJzaW9uIGFuZCBub3QgKF8uaXNTdHJpbmcgQGFwaVZlcnNpb24gb3IgXy5pc0RhdGUgQGFwaVZlcnNpb24pXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ2FwaVZlcnNpb24gbXVzdCBiZSBhIHN0cmluZyBvciBkYXRlJ1xuXG4gICAgaWYgQHNlc3Npb25Ub2tlbiBhbmQgbm90IEBzZXNzaW9uVG9rZW4gaW5zdGFuY2VvZiBhd3MuQ3JlZGVudGlhbHNcbiAgICAgIHRocm93IG5ldyBFcnJvciAnc2Vzc2lvblRva2VuIG11c3QgYmUgYSBBV1MuQ3JlZGVudGlhbHMnXG5cbiAgICBpZiBAY3JlZGVudGlhbHMgYW5kIG5vdCBAY3JlZGVudGlhbHMgaW5zdGFuY2VvZiBhd3MuQ3JlZGVudGlhbHNcbiAgICAgIHRocm93IG5ldyBFcnJvciAnY3JlZGVudGlhbHMgbXVzdCBiZSBhIEFXUy5DcmVkZW50aWFscydcblxuICAgIGlmIEBjcmVkZW50aWFsUHJvdmlkZXIgYW5kIG5vdCBAY3JlZGVudGlhbFByb3ZpZGVyIGluc3RhbmNlb2YgYXdzLkNyZWRlbnRpYWxzUHJvdmlkZXJDaGFpblxuICAgICAgdGhyb3cgbmV3IEVycm9yICdjcmVkZW50aWFsUHJvdmlkZXIgbXVzdCBiZSBhIEFXUy5DcmVkZW50aWFsc1Byb3ZpZGVyQ2hhaW4nXG5cbiAgICBpZiBAbG9nZ2VyIGFuZCBub3QgKEBsb2dnZXIud3JpdGUgYW5kIEBsb2dnZXIubG9nKVxuICAgICAgdGhyb3cgbmV3IEVycm9yICdsb2dnZXIgbXVzdCBoYXZlICN3cml0ZSBvciAjbG9nIG1ldGhvZHMnXG5cblxuIyBFeHBvcnRzXG5tb2R1bGUuZXhwb3J0cyA9IFMzQ2xpZW50XG5cbiJdfQ==
