task :push do |t|
  remove_gps_from_assets
  git_push
end

def git_is_clean?
  `git diff --quiet`
  $?.exitstatus == 0
end

def remove_gps_from_assets
  `find 'assets' -type f -name '*.jpg' | while read FILENAME; do exiftool -all= -overwrite_original_in_place "${FILENAME}"; done;`
  `git add assets`
  unless git_is_clean?
    `git commit --amend -CHEAD`
  end
end

def git_push
  `git push origin master`
end
