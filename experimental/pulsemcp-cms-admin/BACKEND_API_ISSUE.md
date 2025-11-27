# Backend API Issue: Remote Endpoints and Canonical URLs Not Persisting

## Executive Summary

The PulseMCP Admin REST API endpoint `PUT /api/implementations/:id` is not persisting remote endpoint and canonical URL data submitted via nested attributes, despite returning a successful response with the field names listed in the "updated" fields.

## Issue Details

### Endpoint

- **URL**: `PUT https://admin.pulsemcp.com/api/implementations/:id`
- **Authentication**: `X-API-Key` header
- **Content-Type**: `application/x-www-form-urlencoded`

### Expected Behavior

When submitting nested attributes for `remote_attributes` and `canonical_attributes`, the associated records should be created or updated in the database and persist after the request completes.

### Actual Behavior

The API returns a successful response indicating that `remote` and `canonical` fields were updated, but the data does not persist to the database. Subsequent queries show no remote endpoints or canonical URLs associated with the implementation.

## Root Cause Analysis

### Client-Side Fix Applied

The MCP server was incorrectly using parameter names without the `_attributes` suffix:

- ❌ **Before**: `mcp_implementation[remote][0][url_direct]`
- ✅ **After**: `mcp_implementation[remote_attributes][0][url_direct]`

This has been corrected in the MCP server client code to follow Rails nested attributes conventions.

### Potential Backend Issues

Even with the correct parameter format, there may be backend issues that need investigation:

#### 1. **Missing `accepts_nested_attributes_for` Configuration**

The Rails controller may not have nested attributes enabled for these associations.

**Rails Model Expected Configuration:**

```ruby
class McpImplementation < ApplicationRecord
  has_many :mcp_server_remotes, dependent: :destroy
  has_many :canonical_urls, dependent: :destroy

  # These lines may be missing or misconfigured:
  accepts_nested_attributes_for :mcp_server_remotes,
    allow_destroy: true,
    reject_if: :all_blank

  accepts_nested_attributes_for :canonical_urls,
    allow_destroy: true,
    reject_if: :all_blank
end
```

**Controller Expected Strong Parameters:**

```ruby
def update
  # params.require(:mcp_implementation).permit(
  #   ...,
  #   remote_attributes: [:id, :url_direct, :url_setup, :transport,
  #                       :host_platform, :host_infrastructure,
  #                       :authentication_method, :cost, :status,
  #                       :display_name, :internal_notes, :_destroy],
  #   canonical_attributes: [:id, :url, :scope, :note, :_destroy]
  # )
end
```

#### 2. **Association Naming Mismatch**

The association name in the model may not match the expected nested attributes parameter name.

**Check:**

- Does the `McpImplementation` model have `has_many :mcp_server_remotes`?
- Should `remote_attributes` map to `mcp_server_remotes_attributes`?
- Does the model have `has_many :canonical_urls`?
- Should `canonical_attributes` map to `canonical_urls_attributes`?

**If the association is named differently, the parameter should be:**

- `mcp_implementation[mcp_server_remotes_attributes][0][url_direct]` instead of `remote_attributes`
- `mcp_implementation[canonical_urls_attributes][0][url]` instead of `canonical_attributes`

#### 3. **Silent Validation Failures**

Nested records may be failing validation without bubbling up errors to the parent record or API response.

**Check:**

- Are there required fields on `McpServerRemote` or `CanonicalUrl` models not being provided?
- Are there foreign key constraints failing?
- Are validation errors being properly surfaced in the API response?

**Recommended Fix:**

```ruby
# In the model
accepts_nested_attributes_for :mcp_server_remotes,
  allow_destroy: true,
  reject_if: :all_blank

# Ensure validation errors bubble up
validate :check_nested_errors

def check_nested_errors
  mcp_server_remotes.each do |remote|
    remote.errors.full_messages.each { |msg| errors.add(:base, "Remote: #{msg}") }
  end
end
```

#### 4. **Transaction Rollback Issue**

The save operation may be partially succeeding (updating the implementation record) but rolling back the nested records due to a later failure in the transaction.

**Check:**

- Are there any `after_save` callbacks that might fail?
- Are there database constraints on the nested tables causing rollbacks?
- Is the transaction isolation level correct?

#### 5. **Strong Parameters Not Permitting Nested Arrays**

The controller may not be properly permitting the nested array structure.

**Check current strong parameters:**

```ruby
def implementation_params
  params.require(:mcp_implementation).permit(
    # ... other fields ...
    remote_attributes: [
      :id, :url_direct, :url_setup, :transport, :host_platform,
      :host_infrastructure, :authentication_method, :cost, :status,
      :display_name, :internal_notes, :_destroy
    ],
    canonical_attributes: [
      :id, :url, :scope, :note, :_destroy
    ]
  )
end
```

**Note:** Arrays in strong parameters require the `[]` syntax for array of hashes.

## Verification Steps for Backend Team

### 1. Enable Rails Logging for Nested Attributes

```ruby
# In development.rb or add to controller
ActiveRecord::Base.logger = Logger.new(STDOUT)
```

Look for SQL INSERT/UPDATE statements for `mcp_server_remotes` and `canonical_urls` tables.

### 2. Check What Parameters Are Actually Received

```ruby
# In the controller action
Rails.logger.debug "Received params: #{params.inspect}"
Rails.logger.debug "Permitted params: #{implementation_params.inspect}"
```

### 3. Test Nested Attributes Directly in Rails Console

```ruby
impl = McpImplementation.find(11516)

impl.update(
  remote_attributes: [
    {
      url_direct: "https://test.example.com/mcp",
      transport: "sse",
      authentication_method: "open",
      cost: "free",
      status: "live"
    }
  ],
  canonical_attributes: [
    {
      url: "https://test.example.com",
      scope: "domain",
      note: "Test"
    }
  ]
)

# Check if it saved
impl.reload
impl.mcp_server_remotes.count # Should be > 0
impl.canonical_urls.count # Should be > 0
```

### 4. Verify Association Names

```ruby
McpImplementation.reflect_on_all_associations(:has_many).map(&:name)
# Should include :mcp_server_remotes and :canonical_urls (or similar)
```

### 5. Check Strong Parameters Configuration

Look for unpermitted parameters warnings in the logs:

```
Unpermitted parameter: :remote_attributes
Unpermitted parameter: :canonical_attributes
```

## Expected Request Format

After the client-side fix, the MCP server now sends:

```
Content-Type: application/x-www-form-urlencoded

mcp_implementation[remote_attributes][0][url_direct]=https://mcp.mercury.com/mcp
mcp_implementation[remote_attributes][0][transport]=streamable_http
mcp_implementation[remote_attributes][0][authentication_method]=oauth
mcp_implementation[remote_attributes][0][cost]=free
mcp_implementation[remote_attributes][0][status]=live
mcp_implementation[remote_attributes][0][internal_notes]=Official Mercury MCP endpoint

mcp_implementation[canonical_attributes][0][url]=https://mcp.mercury.com
mcp_implementation[canonical_attributes][0][scope]=subdomain
mcp_implementation[canonical_attributes][0][note]=Dedicated MCP subdomain

mcp_implementation[canonical_attributes][1][url]=https://docs.mercury.com/docs/what-is-mercury-mcp
mcp_implementation[canonical_attributes][1][scope]=url
mcp_implementation[canonical_attributes][1][note]=MCP landing page
```

## Recommended Backend Investigation Order

1. **First**: Verify the association names match the expected nested attribute parameter names
2. **Second**: Check strong parameters are properly permitting the nested arrays
3. **Third**: Enable SQL logging and verify INSERT/UPDATE statements are being generated
4. **Fourth**: Check for validation failures on nested records
5. **Fifth**: Look for transaction rollback issues or failed callbacks

## Test Case for Backend Team

```ruby
# spec/requests/api/implementations_spec.rb

RSpec.describe "PUT /api/implementations/:id with nested attributes" do
  let(:implementation) { create(:mcp_implementation) }
  let(:api_key) { create(:api_key, :admin) }

  it "creates remote endpoints via nested attributes" do
    put "/api/implementations/#{implementation.id}",
      params: {
        mcp_implementation: {
          remote_attributes: [
            {
              url_direct: "https://test.example.com/mcp",
              transport: "sse",
              authentication_method: "open",
              cost: "free",
              status: "live"
            }
          ]
        }
      },
      headers: { "X-API-Key" => api_key.token }

    expect(response).to have_http_status(:success)

    implementation.reload
    expect(implementation.mcp_server_remotes.count).to eq(1)
    expect(implementation.mcp_server_remotes.first.url_direct).to eq("https://test.example.com/mcp")
  end

  it "creates canonical URLs via nested attributes" do
    put "/api/implementations/#{implementation.id}",
      params: {
        mcp_implementation: {
          canonical_attributes: [
            {
              url: "https://test.example.com",
              scope: "domain",
              note: "Test note"
            }
          ]
        }
      },
      headers: { "X-API-Key" => api_key.token }

    expect(response).to have_http_status(:success)

    implementation.reload
    expect(implementation.canonical_urls.count).to eq(1)
    expect(implementation.canonical_urls.first.url).to eq("https://test.example.com")
  end
end
```

## Impact

This issue affects all MCP implementations being submitted through the automated poster agent workflow. As of 2025-11-27, **24 implementations** were posted with remote endpoint and/or canonical URL data that did not persist:

- **1 implementation** with remote endpoints (Mercury)
- **3 implementations** with canonical URLs (Mercury, Okta, Local Email Agent)

## References

- Rails Nested Attributes Guide: https://api.rubyonrails.org/classes/ActiveRecord/NestedAttributes/ClassMethods.html
- Strong Parameters: https://guides.rubyonrails.org/action_controller_overview.html#strong-parameters
- Related PR: #180 (feat: add remote endpoint and canonical URL support)

## Contact

For questions about the MCP server implementation, contact the PulseMCP team. The client-side fix has been applied and is pending PR review.
