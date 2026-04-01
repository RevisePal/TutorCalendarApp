const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Inserts SWIFT_STRICT_CONCURRENCY = minimal for ExpoModulesCore into the
 * existing post_install block, fixing Swift 6 strict concurrency errors on Xcode 16.
 */
const withSwiftConcurrencyFix = (config) => {
  return withDangerousMod(config, [
    "ios",
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, "Podfile");
let podfile = fs.readFileSync(podfilePath, "utf8");

      if (podfile.includes("SWIFT_STRICT_CONCURRENCY")) {
        return config;
      }

      const injection =
        "\n  # Fix Swift 6 strict concurrency errors in ExpoModulesCore on Xcode 16\n" +
        "  installer.pods_project.targets.each do |target|\n" +
        "    if target.name == 'ExpoModulesCore'\n" +
        "      target.build_configurations.each do |build_config|\n" +
        "        build_config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'\n" +
        "      end\n" +
        "    end\n" +
        "  end\n";

      podfile = podfile.replace(
        /(post_install do \|installer\|)/,
        `$1${injection}`
      );

      fs.writeFileSync(podfilePath, podfile);
      return config;
    },
  ]);
};

module.exports = withSwiftConcurrencyFix;
