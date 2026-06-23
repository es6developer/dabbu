require 'xcodeproj'

project_path = File.expand_path('../ios/DabbuFamilyFinance.xcodeproj', __dir__)
project = Xcodeproj::Project.open(project_path)

target = project.targets.first

# Create a group for lens icons
icons_group = project.main_group.find_subpath('DabbuFamilyFinance/LensIcons', true)
icons_group.set_source_tree('SOURCE_ROOT')
icons_group.set_path('DabbuFamilyFinance/LensIcons')

# Icon files to add
icons = %w[icon-personal icon-couple icon-family icon-full]

icons.each do |icon|
  png = "#{icon}.png"
  ref = icons_group.new_file(png)
  unless target.resources_build_phase.files_references.include?(ref)
    target.resources_build_phase.add_file_reference(ref)
    puts "Added #{png} to resources"
  else
    puts "#{png} already in resources"
  end
end

project.save
puts 'Done!'
